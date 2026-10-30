import pytest
from app.services.numerical_engine import NumericalEngine

@pytest.fixture
def sample_literacy_table():
    return {
        "document_id": "doc_test_123",
        "document_name": "Sample Statistical Report.pdf",
        "page_number": 2,
        "table_title": "Table 2: State-wise Literacy Rates",
        "headers": ["State", "Literacy Rate (%)", "Male Literacy (%)", "Female Literacy (%)"],
        "rows": [
            ["Kerala", "94.00", "96.11", "92.07"],
            ["Mizoram", "91.33", "93.35", "89.27"],
            ["Goa", "88.70", "92.65", "84.68"],
            ["Himachal Pradesh", "82.80", "89.53", "75.93"],
            ["Maharashtra", "82.34", "88.38", "75.87"],
            ["Bihar", "61.80", "71.20", "51.50"]
        ]
    }

@pytest.fixture
def sample_unemployment_table():
    return {
        "document_id": "doc_test_123",
        "document_name": "Sample Statistical Report.pdf",
        "page_number": 3,
        "table_title": "Table 3: Labor Force Metrics",
        "headers": ["State", "Unemployment Rate (%)", "Registered Workers"],
        "rows": [
            ["Gujarat", "2.2", "27,450,000"],
            ["Himachal Pradesh", "2.8", "3,560,000"],
            ["Karnataka", "3.1", "29,840,000"],
            ["Maharashtra", "3.5", "49,427,000"],
            ["Haryana", "9.0", "9,870,000"]
        ]
    }

def test_highest_literacy_rate_calculation(sample_literacy_table):
    engine = NumericalEngine()
    result = engine.analyze_table_query(
        question="Which state recorded the highest literacy rate?",
        table_meta=sample_literacy_table,
        document_name=sample_literacy_table["document_name"]
    )

    assert result.is_applicable is True
    assert "Kerala" in result.answer_text
    assert "94.00" in result.answer_text or "94" in result.answer_text
    assert result.table_citation.page_number == 2
    assert result.chart_data is not None
    assert result.chart_data.chart_type == "bar"

def test_lowest_unemployment_calculation(sample_unemployment_table):
    engine = NumericalEngine()
    result = engine.analyze_table_query(
        question="Which state has the lowest unemployment rate?",
        table_meta=sample_unemployment_table,
        document_name=sample_unemployment_table["document_name"]
    )

    assert result.is_applicable is True
    assert "Gujarat" in result.answer_text
    assert "2.2" in result.answer_text
    assert result.table_citation.page_number == 3

def test_ranking_and_chart_generation(sample_literacy_table):
    engine = NumericalEngine()
    result = engine.analyze_table_query(
        question="Compare literacy rates across states",
        table_meta=sample_literacy_table,
        document_name=sample_literacy_table["document_name"]
    )

    assert result.is_applicable is True
    assert result.chart_data is not None
    assert len(result.chart_data.data) >= 5
    assert result.chart_data.source_page == 2
