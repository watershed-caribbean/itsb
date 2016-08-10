import os
import csv
from dateutil import parser
import datetime

import json
from operator import itemgetter


# ---------
# Settings
# ---------

CSV_LOCATION = os.getcwd() + '/raw-data/'


# ----------
# Functions
# ----------

# Returns a list of all the csv files in a directory
def get_csv_list(csv_location):
    csv_list = []

    file_list = os.listdir(csv_location)
    for file in file_list:
        if file.lower().endswith('.csv'): csv_list.append(file)

    return csv_list


# Returns a dictionary of author ids (key is the author name and the value is their id)
# author_ids = { 'Aime Cesaire':'acesaire', 'Lydia Cabrera':'lcabrera', ...}
# Returns a list of dictionaries of each author movement
# author_movements =  { 'acesaire': [{'City':'Paris', 'Country':'France', 'Earliest Known Date':'1931-10', 'Latest Known Date':'1935-07', ...}, {...}, ... ], 'lcabrera': [ {}...] , ... }
def process_scholar_files(csv_path, csv_list):
    author_ids = {}
    author_movements = {}

    for csv_name in csv_list:

        with open(csv_path+csv_name) as csv_file:

            reader = csv.reader(csv_file)

            # get the author information from the csv header
            author_info = reader.__next__()
            author_name = author_info[0]
            author_id = author_info[1]
            author_ids[author_name] = author_id

            #read the rest of the csv to get the author's movements
            author_movements[author_id] = []

            reader = csv.DictReader(csv_file)
            row_index = 0
            for row in reader:
                if row['Earliest Known Date'] != '' and row['Last Known Date'] != '':

                    row['Entry ID'] = str(row_index)
                    # row['Earliest Year'] = parser.parse(row['Earliest Known Date']).date().year
                    # row['Earliest Month'] = parser.parse(row['Earliest Known Date']).date().month
                    # row['Last Year'] = parser.parse(row['Last Known Date']).date().year
                    # row['Last Month'] = parser.parse(row['Last Known Date']).date().month
                    #
                    # print('-------')
                    # print(row['Earliest Known Date'], row['Earliest Year'], row['Earliest Month'] )

                    author_movements[author_id].append(row)
                    row_index += 1

            csv_file.close()

    return author_ids, author_movements



def get_earliest_and_latest_dates(author_movements):
    earliest_known_dates = []
    latest_known_dates = []

    for author_id in author_movements:
        for movement in author_movements[author_id]:
            earliest_known_date = movement['Earliest Known Date']
            latest_known_date = movement['Last Known Date']

            if(earliest_known_date != ''):  earliest_known_dates.append(earliest_known_date)
            if(latest_known_date != ''):    latest_known_dates.append(latest_known_date)

    earliest_known_dates = sorted(earliest_known_dates)
    latest_known_dates = sorted(latest_known_dates)

    return earliest_known_dates[0], latest_known_dates[len(latest_known_dates)-1]



def create_date_dict(author_movements):
    date_dict = {}

    earliest_date, latest_date = get_earliest_and_latest_dates(author_movements)

    start_year = int(earliest_date.split('-')[0])
    end_year = int(latest_date.split('-')[0])

    for year in range(start_year, end_year + 1):
        for month in range(1, 13):
            if month < 10:
                year_month = str(year) + '-0' + str(month)
            else:
                year_month = str(year) + '-' + str(month)

            date_dict[year_month]= []

    return date_dict

    ## ??? check month and day precision ??? ##



def generate_trajectories(author_movements):
    date_dict = create_date_dict(author_movements)


    for date in date_dict:

        for author_id in author_movements:
            movements = author_movements[author_id]

            for movement in movements:
                #check earliest
                #check latest

                trajectory_output = {}
                trajectory_output['Author ID'] = author_id

                # add trajectory_output to date_dict


def get_intersections(author_movements):
    print('getting intersections')


# ---------------
# Function calls
# ---------------

csv_list = get_csv_list(CSV_LOCATION)
author_ids, author_movements = process_scholar_files(CSV_LOCATION, csv_list)

for author_id in author_movements:
    print(author_id)
    for movement in author_movements[author_id]:
        print(movement)
        print('--------------------------')

# generate_trajectories(author_movements)




# -----
# TO DO
# -----

##generate trajectories json
# each year/month in 20th century (in all the data) (dates in string format)

##generate intersections json
# each year/month in 20th century (in all the data)
# add each author to that year/month if they were there according to provided data



# could be helpful...

# # sort all of the movements by the 'Earliest Known Date' key
# sorted_by_entry_date = sorted(author_movements[author_id], key= itemgetter('Earliest Known Date'))
# author_movements[author_id] = sorted_by_entry_date