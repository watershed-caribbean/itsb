import pandas as pd
import datetime
from pandas_datareader import data, wb
import csv
import json

out= open("testfile.csv", "rb")
data = csv.reader(out)
data = [[row[0],row[1] + "_" + row[2],row[3] +"_" + row[4], row[5],row[6]] for row in data]
out.close()

out=open("data.csv", "wb")
output = csv.writer(out)

for row in data:
    output.writerow(row)

out.close()
df = pd.read_csv('data.csv')

df.DateDpt = pd.to_datetime(df.DateDpt)
df.DateAr = pd.to_datetime(df.DateAr)
df = df.set_index('DateAr')
new_df = pd.DataFrame()
for i, data in df.iterrows():
    data = data.to_frame().transpose()
    data = data.reindex(pd.date_range(start=data.index[0], end=data.DateDpt[0])).fillna(method='ffill').reset_index().rename(columns={'index': 'DateAr'})
    new_df = pd.concat([new_df, data])

new_df = new_df[['AuthorID', 'ArCity_ArCountry', 'DptCity_DptCountry', 'DateAr', 'DateDpt']]

#print new_df
json_dict = {}

for arrival_date, data in new_df.groupby('DateAr'):
    matching_dates = data[data.DateDpt==arrival_date]
    not_matching_dates = data[data.DateDpt!=arrival_date]
    json_dict[arrival_date.strftime('%Y-%m-%d')] = {}
    if not matching_dates.empty:
        for city, flights in matching_dates.groupby('ArCity_ArCountry'):
            json_dict[arrival_date.strftime('%Y-%m-%d')][city] = [str(v) for v in flights.AuthorID.to_dict().values()]
    if not not_matching_dates.empty:
        for city, flights in not_matching_dates.groupby('DptCity_DptCountry'):
            json_dict[arrival_date.strftime('%Y-%m-%d')][city] = [str(v) for v in flights.AuthorID.to_dict().values()]

print(json.dumps(json_dict, indent=4, sort_keys=True))
