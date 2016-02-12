# In The Same Boats:
# Converter using Pandas

# Load the necessary libraries

import pandas as pd
# import pandas_datareader
from datetime import date, timedelta as td, datetime
import numpy as np
import json

df = pd.read_csv('itinerary1.csv')
df["ArCiCo"] = df["ArCity"] + "_" + df["ArCountry"]
df["DptCiCo"] = df["DptCity"] + "_" + df["DptCountry"]
df["Date"] = df["DateAr"] + " : " + df["DateDpt"]
df.DateDpt = pd.to_datetime(df.DateDpt)
df.DateAr = pd.to_datetime(df.DateAr)
old_df = pd.DataFrame(df, columns = ['AuthorID', 'ArCiCo', 'DptCiCo', 'Date'])
json_dict = {}
for date_range, flights in old_df.groupby('Date'):
    flights_no_date = flights.drop('Date', axis=1)
    json_dict[date_range]= map(list, flights_no_date.values)
    
with open('testdata.json', 'w') as f:
     json.dump(json_dict, f, indent=4, sort_keys=True)
# Second json script ends here 
df = df.set_index('DateAr')
new_df = pd.DataFrame()
for i, data in df.iterrows():
    data = data.to_frame().transpose()
    data = data.reindex(pd.date_range(start=data.index[0], end=data.DateDpt[0])).fillna(method='ffill').reset_index().rename(columns={'index': 'DateAr'})
    new_df = pd.concat([new_df, data])
    new_df = new_df[['AuthorID', 'ArCiCo', 'DptCiCo', 'DateAr', 'DateDpt']]

new_df = new_df.drop_duplicates(['AuthorID', 'DateAr'], keep='last')
#print new_df

json_dict = {}

for arrival_date, data in new_df.groupby('DateAr'):
    #matching_dates = data[data.DateDpt==arrival_date]
    #not_matching_dates = data[data.DateDpt!=arrival_date]
    #print data
    json_dict[arrival_date.strftime('%Y-%m-%d')] = {}
    #if not matching_dates.empty:
       # for city, flights in matching_dates.groupby('ArCiCo'):
         #   json_dict[arrival_date.strftime('%Y-%m-%d')][city] = [str(v) for v in flights.AuthorID]
    #if not not_matching_dates.empty:
    for city, flights in data.groupby('DptCiCo'):
        #print flights
        json_dict[arrival_date.strftime('%Y-%m-%d')][city] = [str(v) for v in flights.AuthorID]
            

with open('json_dict.json', 'w') as f:
     json.dump(json_dict, f, indent=4, sort_keys=True)


