import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_sample_report(output_path: str):
    """
    Generates a multi-page mock government statistical report for testing ReportIQ.
    Clearly annotated as sample mock data for development.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=10
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=8
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=8
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Italic'],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=15
    )

    story = []

    # ================= PAGE 1 =================
    story.append(Paragraph("National Statistical Survey Report (Sample Data)", title_style))
    story.append(Paragraph("<i>Notice: This is synthetic sample test data generated strictly for developmental verification.</i>", disclaimer_style))
    story.append(Paragraph("Section 1: Executive Demographic Overview", h2_style))
    story.append(Paragraph(
        "According to the survey enumeration, the total population recorded in the report was 1,380,004,385 across all surveyed administrative units. "
        "The percentage of rural population stands at 68.84%, reflecting continuous rural-urban demographic transition patterns. "
        "The overall national literacy rate recorded in the report was 74.04% for individuals aged seven years and above. "
        "The total number of registered workers identified during this survey period was 472,190,000 across organized and unorganized economic sectors.",
        body_style
    ))
    story.append(Spacer(1, 15))
    story.append(Paragraph("Key Indicator Summary Table (Page 1)", h2_style))
    
    p1_table_data = [
        ["Indicator", "Value", "Unit", "Survey Reference Period"],
        ["Total Population", "1,380,004,385", "Persons", "2021 Survey Cycle"],
        ["National Literacy Rate", "74.04%", "Percentage", "2021 Survey Cycle"],
        ["Percentage of Rural Population", "68.84%", "Percentage", "2021 Survey Cycle"],
        ["Total Registered Workers", "472,190,000", "Workers", "2021 Survey Cycle"],
        ["Sex Ratio", "943", "Females per 1000 Males", "2021 Survey Cycle"],
    ]
    t1 = Table(p1_table_data, colWidths=[150, 110, 100, 150])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    story.append(t1)

    story.append(PageBreak())

    # ================= PAGE 2 =================
    story.append(Paragraph("Section 2: State-wise Literacy Rate Analysis", title_style))
    story.append(Paragraph("Table 2: State-wise Literacy Rates and Educational Metrics", h2_style))
    story.append(Paragraph(
        "Educational attainment varied substantially across states. Kerala recorded the highest literacy rate at 94.00%, "
        "followed closely by Mizoram at 91.33% and Goa at 88.70%. In contrast, Bihar recorded the lowest literacy rate at 61.80%.",
        body_style
    ))
    story.append(Spacer(1, 10))

    p2_table_data = [
        ["State", "Literacy Rate (%)", "Male Literacy (%)", "Female Literacy (%)", "Rank"],
        ["Kerala", "94.00", "96.11", "92.07", "1"],
        ["Mizoram", "91.33", "93.35", "89.27", "2"],
        ["Goa", "88.70", "92.65", "84.68", "3"],
        ["Himachal Pradesh", "82.80", "89.53", "75.93", "4"],
        ["Maharashtra", "82.34", "88.38", "75.87", "5"],
        ["Gujarat", "78.03", "85.75", "69.68", "6"],
        ["West Bengal", "76.26", "81.69", "70.54", "7"],
        ["Uttar Pradesh", "67.68", "77.28", "57.18", "8"],
        ["Bihar", "61.80", "71.20", "51.50", "9"],
    ]
    t2 = Table(p2_table_data, colWidths=[120, 100, 100, 100, 60])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F1F5F9')),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    story.append(t2)

    story.append(PageBreak())

    # ================= PAGE 3 =================
    story.append(Paragraph("Section 3: Labor Force and Unemployment Statistics", title_style))
    story.append(Paragraph("Table 3: Labor Force Metrics by State", h2_style))
    story.append(Paragraph(
        "Employment metrics across major industrial states demonstrate that Gujarat recorded the lowest unemployment rate at 2.2%, "
        "followed by Himachal Pradesh at 2.8% and Karnataka at 3.1%. The total number of registered workers in Maharashtra was highest at 49,427,000.",
        body_style
    ))
    story.append(Spacer(1, 10))

    p3_table_data = [
        ["State", "Unemployment Rate (%)", "Registered Workers", "Labor Participation (%)"],
        ["Gujarat", "2.2", "27,450,000", "54.8"],
        ["Himachal Pradesh", "2.8", "3,560,000", "51.2"],
        ["Karnataka", "3.1", "29,840,000", "52.7"],
        ["Maharashtra", "3.5", "49,427,000", "53.9"],
        ["West Bengal", "4.6", "34,750,000", "48.3"],
        ["Uttar Pradesh", "5.8", "65,820,000", "46.1"],
        ["Kerala", "7.0", "12,650,000", "49.5"],
        ["Haryana", "9.0", "9,870,000", "45.2"],
    ]
    t3 = Table(p3_table_data, colWidths=[130, 120, 120, 130])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    story.append(t3)

    story.append(PageBreak())

    # ================= PAGE 4 =================
    story.append(Paragraph("Section 4: Decadal Population Growth Comparison (2011 - 2021)", title_style))
    story.append(Paragraph("Table 4: Comparative Decadal Census Growth Rates", h2_style))
    story.append(Paragraph(
        "A comparison of population changes between 2011 and 2021 indicates differing rates of decadal growth across states.",
        body_style
    ))
    story.append(Spacer(1, 10))

    p4_table_data = [
        ["State", "2011 Population", "2021 Population", "Percentage Change (%)"],
        ["Bihar", "104,099,452", "124,799,926", "19.88"],
        ["Uttar Pradesh", "199,812,341", "235,687,000", "17.95"],
        ["Gujarat", "60,439,692", "70,400,000", "16.48"],
        ["Maharashtra", "112,374,333", "126,189,673", "12.29"],
        ["West Bengal", "91,276,115", "99,600,000", "9.12"],
        ["Kerala", "33,406,061", "35,699,443", "6.87"],
    ]
    t4 = Table(p4_table_data, colWidths=[120, 120, 120, 140])
    t4.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F1F5F9')),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    story.append(t4)

    doc.build(story)
    print(f"Sample statistical report generated at: {output_path}")

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "sample_statistical_report.pdf")
    generate_sample_report(out)
