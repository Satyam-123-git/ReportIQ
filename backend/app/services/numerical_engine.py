import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
from app.schemas.chat import ChartData, CalculationDetail, Citation

logger = logging.getLogger("reportiq.numerical_engine")

class NumericalAnalysisResult:
    def __init__(
        self,
        is_applicable: bool = False,
        answer_text: Optional[str] = None,
        calculation_detail: Optional[CalculationDetail] = None,
        chart_data: Optional[ChartData] = None,
        table_citation: Optional[Citation] = None,
        raw_dataframe: Optional[pd.DataFrame] = None
    ):
        self.is_applicable = is_applicable
        self.answer_text = answer_text
        self.calculation_detail = calculation_detail
        self.chart_data = chart_data
        self.table_citation = table_citation
        self.raw_dataframe = raw_dataframe

class NumericalEngine:
    """
    Pandas & NumPy Powered Statistical Verification & Computation Engine.
    Executes arithmetic, rankings, comparisons, and aggregations deterministically
    to prevent LLM math hallucinations.
    """

    @staticmethod
    def table_to_dataframe(headers: List[str], rows: List[List[Any]]) -> pd.DataFrame:
        """Converts raw table headers and rows into a clean, typed Pandas DataFrame."""
        if not headers or not rows:
            return pd.DataFrame()

        # Sanitize column headers
        clean_headers = [str(h).strip() if h else f"Col_{i}" for i, h in enumerate(headers)]
        
        # Build DataFrame
        df = pd.DataFrame(rows, columns=clean_headers)

        # Attempt to clean and coerce numeric columns
        for col in df.columns:
            # Strip whitespace
            df[col] = df[col].astype(str).str.strip()
            
            # Check if column is numeric or percentage
            sample_vals = df[col].dropna().tolist()
            if not sample_vals:
                continue

            cleaned_series = (
                df[col]
                .str.replace(",", "", regex=False)
                .str.replace("%", "", regex=False)
                .str.replace("$", "", regex=False)
                .str.replace("₹", "", regex=False)
                .str.strip()
            )

            numeric_series = pd.to_numeric(cleaned_series, errors="coerce")
            # If at least 60% of non-empty values parsed to numbers, retain numeric column
            valid_ratio = numeric_series.notna().sum() / max(1, len(sample_vals))
            if valid_ratio >= 0.6:
                df[f"{col}_numeric"] = numeric_series

        return df

    def analyze_table_query(
        self,
        question: str,
        table_meta: Dict[str, Any],
        document_name: str
    ) -> NumericalAnalysisResult:
        """
        Detects if a question requires numerical reasoning on a table.
        If applicable, computes the exact statistics using Pandas/NumPy.
        """
        headers = table_meta.get("headers", [])
        rows = table_meta.get("rows", [])
        page_number = table_meta.get("page_number", 1)
        table_title = table_meta.get("table_title", f"Table on Page {page_number}")
        document_id = table_meta.get("document_id", "")

        df = self.table_to_dataframe(headers, rows)
        if df.empty:
            return NumericalAnalysisResult(is_applicable=False)

        q_lower = question.lower()

        # Identify numeric columns
        num_cols = [c for c in df.columns if c.endswith("_numeric")]
        raw_num_cols = [c.replace("_numeric", "") for c in num_cols]
        # Identify text/label columns (e.g. State, Country, Region, Indicator)
        label_cols = [c for c in df.columns if not c.endswith("_numeric") and c not in raw_num_cols]
        primary_label_col = label_cols[0] if label_cols else (df.columns[0] if len(df.columns) > 0 else None)

        if not num_cols or not primary_label_col:
            return NumericalAnalysisResult(is_applicable=False)

        # Match relevant numeric column based on query words
        target_num_col = None
        target_raw_col = None
        for raw_c, num_c in zip(raw_num_cols, num_cols):
            tokens = re.findall(r"\w+", raw_c.lower())
            if any(t in q_lower for t in tokens if len(t) > 2):
                target_num_col = num_c
                target_raw_col = raw_c
                break

        # If no column matched directly, only match if the table title specifically matches the topic
        if not target_num_col:
            title_tokens = re.findall(r"\w+", table_title.lower())
            matching_title_tokens = [t for t in title_tokens if len(t) > 3 and t in q_lower and t not in ["table", "page", "metrics", "data", "survey"]]
            if matching_title_tokens and num_cols:
                target_num_col = num_cols[0]
                target_raw_col = raw_num_cols[0]
            else:
                return NumericalAnalysisResult(is_applicable=False)

        valid_df = df.dropna(subset=[target_num_col, primary_label_col]).copy()
        if valid_df.empty:
            return NumericalAnalysisResult(is_applicable=False)

        # 1. Highest / Maximum / Top Ranking
        if any(w in q_lower for w in ["highest", "maximum", "max", "most", "top", "greatest"]):
            max_idx = valid_df[target_num_col].idxmax()
            best_row = valid_df.loc[max_idx]
            entity = best_row[primary_label_col]
            val = best_row[target_num_col]

            # Sort top 5 for chart
            top_df = valid_df.sort_values(by=target_num_col, ascending=False).head(8)
            chart_data = self._build_bar_chart(
                df=top_df,
                label_col=primary_label_col,
                val_col=target_num_col,
                title=f"Top {len(top_df)} by {target_raw_col}",
                page_number=page_number,
                document_name=document_name
            )

            calc_detail = CalculationDetail(
                method="Pandas DataFrame idxmax() Maximum Finding",
                formula=f"max(df['{target_raw_col}'])",
                inputs={"column": target_raw_col, "entity_column": primary_label_col},
                result={entity: float(val)}
            )

            answer = (
                f"According to {table_title} (Page {page_number}), **{entity}** recorded the highest "
                f"**{target_raw_col}** with a value of **{val:,.2f}** "
                f"(programmatically calculated using Pandas numerical analysis)."
            )

            citation = Citation(
                document_id=document_id,
                document_name=document_name,
                page_number=page_number,
                evidence=f"Table: {table_title}\nRow: {entity} | {target_raw_col}: {val}",
                source_type="Table",
                table_title=table_title,
                relevance_score=0.98
            )

            return NumericalAnalysisResult(
                is_applicable=True,
                answer_text=answer,
                calculation_detail=calc_detail,
                chart_data=chart_data,
                table_citation=citation,
                raw_dataframe=valid_df
            )

        # 2. Lowest / Minimum / Bottom
        if any(w in q_lower for w in ["lowest", "minimum", "min", "least", "bottom"]):
            min_idx = valid_df[target_num_col].idxmin()
            worst_row = valid_df.loc[min_idx]
            entity = worst_row[primary_label_col]
            val = worst_row[target_num_col]

            bottom_df = valid_df.sort_values(by=target_num_col, ascending=True).head(8)
            chart_data = self._build_bar_chart(
                df=bottom_df,
                label_col=primary_label_col,
                val_col=target_num_col,
                title=f"Lowest {len(bottom_df)} by {target_raw_col}",
                page_number=page_number,
                document_name=document_name
            )

            calc_detail = CalculationDetail(
                method="Pandas DataFrame idxmin() Minimum Finding",
                formula=f"min(df['{target_raw_col}'])",
                inputs={"column": target_raw_col, "entity_column": primary_label_col},
                result={entity: float(val)}
            )

            answer = (
                f"According to {table_title} (Page {page_number}), **{entity}** recorded the lowest "
                f"**{target_raw_col}** with a value of **{val:,.2f}** "
                f"(programmatically verified using Pandas numerical analysis)."
            )

            citation = Citation(
                document_id=document_id,
                document_name=document_name,
                page_number=page_number,
                evidence=f"Table: {table_title}\nRow: {entity} | {target_raw_col}: {val}",
                source_type="Table",
                table_title=table_title,
                relevance_score=0.98
            )

            return NumericalAnalysisResult(
                is_applicable=True,
                answer_text=answer,
                calculation_detail=calc_detail,
                chart_data=chart_data,
                table_citation=citation,
                raw_dataframe=valid_df
            )

        # 3. Total / Sum
        if any(w in q_lower for w in ["total", "sum", "overall"]):
            total_val = float(valid_df[target_num_col].sum())
            calc_detail = CalculationDetail(
                method="Pandas DataFrame sum() Aggregation",
                formula=f"sum(df['{target_raw_col}'])",
                inputs={"column": target_raw_col, "row_count": len(valid_df)},
                result=total_val
            )

            # Chart top contributors
            top_df = valid_df.sort_values(by=target_num_col, ascending=False).head(6)
            chart_data = self._build_bar_chart(
                df=top_df,
                label_col=primary_label_col,
                val_col=target_num_col,
                title=f"Distribution of {target_raw_col} across top entities",
                page_number=page_number,
                document_name=document_name
            )

            answer = (
                f"The aggregate total for **{target_raw_col}** across all {len(valid_df)} reported items in "
                f"{table_title} (Page {page_number}) is **{total_val:,.2f}**."
            )

            citation = Citation(
                document_id=document_id,
                document_name=document_name,
                page_number=page_number,
                evidence=f"Table: {table_title}\nTotal calculated over {len(valid_df)} rows for {target_raw_col}.",
                source_type="Table",
                table_title=table_title,
                relevance_score=0.95
            )

            return NumericalAnalysisResult(
                is_applicable=True,
                answer_text=answer,
                calculation_detail=calc_detail,
                chart_data=chart_data,
                table_citation=citation,
                raw_dataframe=valid_df
            )

        # 4. Average / Mean
        if any(w in q_lower for w in ["average", "mean"]):
            avg_val = float(valid_df[target_num_col].mean())
            calc_detail = CalculationDetail(
                method="NumPy/Pandas mean() Calculation",
                formula=f"mean(df['{target_raw_col}'])",
                inputs={"column": target_raw_col, "count": len(valid_df)},
                result=avg_val
            )

            top_df = valid_df.sort_values(by=target_num_col, ascending=False).head(6)
            chart_data = self._build_bar_chart(
                df=top_df,
                label_col=primary_label_col,
                val_col=target_num_col,
                title=f"Entities relative to Average ({avg_val:,.2f})",
                page_number=page_number,
                document_name=document_name
            )

            answer = (
                f"The average **{target_raw_col}** across {len(valid_df)} records in "
                f"{table_title} (Page {page_number}) is **{avg_val:,.2f}**."
            )

            citation = Citation(
                document_id=document_id,
                document_name=document_name,
                page_number=page_number,
                evidence=f"Table: {table_title}\nAverage calculated across {len(valid_df)} entries.",
                source_type="Table",
                table_title=table_title,
                relevance_score=0.95
            )

            return NumericalAnalysisResult(
                is_applicable=True,
                answer_text=answer,
                calculation_detail=calc_detail,
                chart_data=chart_data,
                table_citation=citation,
                raw_dataframe=valid_df
            )

        # 5. Comparison or Ranking
        if any(w in q_lower for w in ["compare", "comparison", "ranking", "rank", "list", "vs", "versus"]):
            sorted_df = valid_df.sort_values(by=target_num_col, ascending=False).head(10)
            chart_data = self._build_bar_chart(
                df=sorted_df,
                label_col=primary_label_col,
                val_col=target_num_col,
                title=f"Comparative Ranking: {target_raw_col}",
                page_number=page_number,
                document_name=document_name
            )

            top_items_text = ", ".join([
                f"{row[primary_label_col]} ({row[target_num_col]:,.2f})"
                for _, row in sorted_df.head(5).iterrows()
            ])

            calc_detail = CalculationDetail(
                method="Pandas DataFrame sort_values() Ranking",
                formula=f"df.sort_values(by='{target_raw_col}', ascending=False)",
                inputs={"column": target_raw_col},
                result=[{"name": row[primary_label_col], "val": float(row[target_num_col])} for _, row in sorted_df.iterrows()]
            )

            answer = (
                f"Here is the verified ranking for **{target_raw_col}** from {table_title} (Page {page_number}):\n\n"
                f"Leading entries: {top_items_text}.\n\n"
                f"A complete visual comparison is shown in the chart below."
            )

            citation = Citation(
                document_id=document_id,
                document_name=document_name,
                page_number=page_number,
                evidence=f"Table: {table_title}\nTop ranked rows: {top_items_text}",
                source_type="Table",
                table_title=table_title,
                relevance_score=0.95
            )

            return NumericalAnalysisResult(
                is_applicable=True,
                answer_text=answer,
                calculation_detail=calc_detail,
                chart_data=chart_data,
                table_citation=citation,
                raw_dataframe=valid_df
            )

        return NumericalAnalysisResult(is_applicable=False)

    def _build_bar_chart(
        self,
        df: pd.DataFrame,
        label_col: str,
        val_col: str,
        title: str,
        page_number: int,
        document_name: str
    ) -> ChartData:
        data_points = []
        for _, row in df.iterrows():
            data_points.append({
                "label": str(row[label_col])[:20],  # truncate long labels
                "value": round(float(row[val_col]), 2)
            })

        return ChartData(
            chart_type="bar",
            title=title,
            description=f"Extracted from Page {page_number} of {document_name}",
            x_key="label",
            y_keys=["value"],
            data=data_points,
            source_page=page_number,
            source_document=document_name
        )
