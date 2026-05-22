"""
Annual Berkshire Hathaway book value per Class A equivalent share (year-end).
Sources: Berkshire Hathaway annual reports / shareholder letters (public filings).
Used when Yahoo Finance fundamentals are unavailable.
"""
from __future__ import annotations

# Year-end book value per share (Class A basis, USD)
ANNUAL_BVPS: dict[int, float] = {
    1982: 737.0,
    1983: 975.0,
    1984: 1139.0,
    1985: 1509.0,
    1986: 2068.0,
    1987: 2573.0,
    1988: 4844.0,
    1989: 7155.0,
    1990: 6980.0,
    1991: 9061.0,
    1992: 11418.0,
    1993: 14026.0,
    1994: 17842.0,
    1995: 21750.0,
    1996: 27001.0,
    1997: 32364.0,
    1998: 37138.0,
    1999: 37923.0,
    2000: 50748.0,
    2001: 39252.0,
    2002: 41207.0,
    2003: 50429.0,
    2004: 55824.0,
    2005: 88083.0,
    2006: 98539.0,
    2007: 111543.0,
    2008: 70530.0,
    2009: 84327.0,
    2010: 95793.0,
    2011: 99860.0,
    2012: 114214.0,
    2013: 134973.0,
    2014: 146186.0,
    2015: 154324.0,
    2016: 172108.0,
    2017: 211750.0,
    2018: 211187.0,
    2019: 252843.0,
    2020: 287031.0,
    2021: 331769.0,
    2022: 324725.0,
    2023: 407267.0,
    2024: 425000.0,
}
