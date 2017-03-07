# In The Same Boats:
# Converter using Pandas

# Load the necessary libraries

import pandas as pd
from datetime import date, timedelta as td, datetime
import numpy as np
import json

# I. PRELIMINARY DATA PREPARATION FROM CSV

# 1. Open CSV file as a Data Frame

df = pd.read_csv('itinerary.csv')
def checkup(x):
    if len(x) == 4:
        return 'Y'
    elif len(x) == 7:
        return 'M'
    else:
        return 'D'
df['specificity'] = df['DateArrival'].map(checkup)
df['DateArrival'] = pd.to_datetime(df['DateArrival'])  
mask = df['DateDeparture'].str.len() == 4 
df['specificity'] = df['DateDeparture'].map(checkup)
#print mask
df['DateDeparture'] = pd.to_datetime(df['DateDeparture'])
df.loc[mask, 'DateDeparture' ] +=  pd.offsets.YearEnd()

# 2. Concatanate the City and Country for departure and arrival
df["ArCiCo"] = df["CityArrival"] + "_" + df["CountryArrival"]
df["DptCiCo"] = df["CityDeparture"] + "_" + df["CountryDeparture"]
df["Date"] = df["DateDeparture"]


# 3. Convert dates from txt to datetime data type
df['DateDeparture'] = pd.to_datetime(df['DateDeparture'])
df['DateArrival'] = pd.to_datetime(df['DateArrival'])

# II. GENERATE TRAJECTORIES JSON (trajectories.json):
# The trajectories are the trips from one place to another on a given date. They will be represented as lines on the D3 map

# 1. Create Dafa Frame for trajectories (df1) with only four columns and automatically generated index

df1 = pd.DataFrame(df, columns = ['AuthorID', 'ArCiCo', 'DptCiCo', 'Date', 'specificity','Timestamp','Name','Type', 'Event','CitationSource','Notes'])

# 2. Create empty dictionary
json_dict = {}

# 3. Populate dictionary
for date_range, flights in df1.groupby('Date'):
    # Purge out repeated dates in the list
    dup_date = flights.drop('Date', axis=1)
    # Map values into the dictionary
    #json_dict[date_range] = map(list, dup_date.values)
    json_dict[date_range.strftime('%Y-%m-%d')]= dup_date.to_dict(orient="records")

# 4. Convert into json and save
with open('trajectories.json', 'w') as f:
     json.dump(json_dict, f, indent=4, sort_keys=True, ensure_ascii=False)

# GENERATE INTERSECIONS JSON
# Intersections are points in time and space shared by two or more persons

# 1. Use Date of Arrival (DateAr) as the index
df = df.set_index('DateArrival')

# 2. Create empty Data Frame for intersections
df2 = pd.DataFrame()

# 3. Expand the dates

#iterate through every row
for i, data in df.iterrows():
    # grab each line (series) and transpose it from row to column
    data = data.to_frame().transpose()
    # Use expanded date (arrival) as the index
    data = data.reindex(pd.date_range(start=data.index[0], end=data.DateDeparture[0])).fillna(method='ffill').reset_index().rename(columns={'index': 'DateArrival'})

    # Concatanate with new columns
    df2 = pd.concat([df2, data])
    df2 = df2[['AuthorID', 'ArCiCo', 'DptCiCo', 'DateArrival', 'DateDeparture', 'specificity']]

# 4. Drop duplicates to solve 'embedded dates' problem
df2 = df2.drop_duplicates(['AuthorID', 'DateArrival'], keep='last')

# 5. Create empty dictionary
json_dict = {}

# 6. Populate dictionary
for arrival_date, data in df2.groupby('DateArrival'):
    # Re-convert dates to string.
    json_dict[arrival_date.strftime('%Y-%m-%d')] = {}
    for city, flights in data.groupby('ArCiCo'):
	
        dup_date = flights.drop(['DateArrival', 'DateDeparture', 'ArCiCo', 'DptCiCo'], axis=1)
        json_dict[arrival_date.strftime('%Y-%m-%d')][city] = dup_date.to_dict(orient="records")#dup_date.to_dict(orient="records")#
    # Populate dictionary grouped by Departure Location
    for city, flights in data.groupby('DptCiCo'):
	
        dup_date = flights.drop(['DateArrival', 'DateDeparture', 'ArCiCo', 'DptCiCo'], axis=1)
        json_dict[arrival_date.strftime('%Y-%m-%d')][city] = dup_date.to_dict(orient="records")#dup_date.to_dict(orient="records")# 
            
# 7. Dump into JSON file
with open('intersections.json', 'w') as f:
     json.dump(json_dict, f, indent=4, sort_keys=True,ensure_ascii=False)


