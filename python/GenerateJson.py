import os
import csv
import codecs
import json
from geopy import geocoders


# # TO DO:
# # test on more csvs
# # output certainty (add to csv files)


# ---------
# Settings
# ---------

CSV_LOCATION = os.getcwd() + '/raw-data/'
AUTHOR_ID_JSON = os.getcwd() + '/testing_author_ids.json'
TRAJECTORIES_JSON = os.getcwd() + '/testing_trajectories.json'
INTERSECTIONS_JSON = os.getcwd() + '/testing_intersections.json'
PLACES_JSON = os.getcwd() + '/testing_places.json'
GEONAMES_USERNAME = 'alyv'



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


# Returns the GeoNames latitude and longitude of the place name provided.
# If the place is not found, the function returns None for both longitude
# and latitude.
def get_lat_long(place_name, geonames_username):
    gn = geocoders.GeoNames(username=geonames_username, timeout=None)
    location = gn.geocode(place_name,timeout=None)
    if location == None:
        print(place_name, "not found.")
        return None, None
    else:
        return location.latitude, location.longitude


# Returns a dictionary of author ids (key is the author name and the value is their id)
# author_ids = { 'Aime Cesaire':'acesaire', 'Lydia Cabrera':'lcabrera', ...}
# Returns a list of dictionaries of each author movement
# author_movements =  { 'acesaire': [{'City':'Paris', 'Country':'France', 'Earliest Known Date':'1931-10', 'Last Known Date':'1935-07', ...}, {...}, ... ], 'lcabrera': [ {}...] , ... }
# Returns a dictionary of places
# places = { 'PlaceName': {'Lat': xxx, 'Long': yyy, 'Place ID': ##}, ... }
def process_scholar_files(csv_path, csv_list, geonames_username):
    author_ids = {}
    author_movements = {}
    places = {}
    place_id = 0

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

                    place_name = row['City'] + ', ' + row['Country']
                    if not place_name in places:
                        place_info = {}

                        lat, long = get_lat_long(place_name, geonames_username)
                        place_info['Lat'] = lat
                        place_info['Long'] = long
                        place_info['Place ID'] = str(place_id)
                        place_id += 1

                        places[place_name] = place_info

                    row['Place ID'] = places[place_name]['Place ID']
                    row['Entry ID'] = str(row_index)

                    author_movements[author_id].append(row)
                    row_index += 1

            csv_file.close()

    return author_ids, author_movements, places


# Returns the earliest and latest dates in the data
def get_earliest_and_latest_dates(author_movements):
    earliest_known_dates = []
    latest_known_dates = []

    for author_id in author_movements:
        for movement in author_movements[author_id]:
            earliest_known_date = movement['Earliest Known Date']
            latest_known_date = movement['Last Known Date']

            earliest_known_dates.append(earliest_known_date)
            latest_known_dates.append(latest_known_date)

    earliest_known_dates = sorted(earliest_known_dates)
    latest_known_dates = sorted(latest_known_dates)

    return earliest_known_dates[0], latest_known_dates[len(latest_known_dates)-1]


# Returns a dictionary with keys for every year-month from the earliest
# year in the data to the latest year in the data, for example:
# date_dict = {'1899-01': [], '1899-02': [], ... , '1999-12': []}
def create_date_dict(author_movements):
    date_dict = {}

    earliest_date, latest_date = get_earliest_and_latest_dates(author_movements)

    start_year = int(earliest_date.split('-')[0])
    end_year = int(latest_date.split('-')[0])

    for year in range(start_year, end_year + 1):
        for month in range(1, 13): # 12 months
            if month < 10: year_month = str(year) + '-0' + str(month)
            else: year_month = str(year) + '-' + str(month)

            date_dict[year_month] = []

    return date_dict

    # # ??? do we need month precision for start and end dates ??? # #


# Returns a list of all of the year-month dates that a scholar was in a place
def get_dates_in_place(movement):
    dates_in_place = []

    earliest_date_split = movement['Earliest Known Date'].split('-')
    latest_date_split = movement['Last Known Date'].split('-')

    start_year = int(earliest_date_split[0])
    end_year = int(latest_date_split[0])

    if len(earliest_date_split) >= 2: start_month = int(earliest_date_split[1])
    else: start_month = 1

    if len(latest_date_split) >= 2: end_month = int(latest_date_split[1])
    else: end_month = 12

    for year in range(start_year, end_year + 1):
        if start_year == end_year:
            for month in range(start_month, end_month + 1):
                if month < 10: date = str(year) + '-0' + str(month)
                else: date = str(year) + '-' + str(month)
                dates_in_place.append(date)
            break

        elif year == end_year:
            for month in range(1, end_month + 1):
                if month < 10: date = str(year) + '-0' + str(month)
                else: date = str(year) + '-' + str(month)
                dates_in_place.append(date)
            break

        elif year == start_year:
            for month in range(start_month, 13):
                if month < 10: date = str(year) + '-0' + str(month)
                else: date = str(year) + '-' + str(month)
                dates_in_place.append(date)

        else:
            for month in range(1, 13): # 12 months
                if month < 10: date = str(year) + '-0' + str(month)
                else: date = str(year) + '-' + str(month)
                dates_in_place.append(date)

    return dates_in_place


# Returns the dictionary for the trajectories json
def get_trajectories(author_movements):
    trajectories = create_date_dict(author_movements)

    for author_id in author_movements:
        for movement in author_movements[author_id]:

            trajectory_output = {}
            trajectory_output['Author ID'] = author_id
            trajectory_output['Entry ID'] = movement['Entry ID']
            trajectory_output['Place ID'] = movement['Place ID']
            trajectory_output['Citation'] = movement['Citation']
            trajectory_output['Notes'] = movement['Notes']
            # # ADD certainty

            dates_in_place = get_dates_in_place(movement)
            for date in dates_in_place:
                trajectories[date].append(trajectory_output)

    return trajectories


# Returns the dictionary for the intersections json
def get_intersections(author_movements):
    intersections = create_date_dict(author_movements)
    for date in intersections: intersections[date] = {}

    for author_id in author_movements:
        for movement in author_movements[author_id]:
            dates_in_place = get_dates_in_place(movement)
            place_id = movement['Place ID']

            for date in dates_in_place:
                if not place_id in intersections[date]: intersections[date][place_id] = []

                intersection_output = {}
                intersection_output['Author ID'] = author_id
                # # ADD certainty

                intersections[date][place_id].append(intersection_output)

    return intersections



# ---------------
# Function calls
# ---------------

csv_list = get_csv_list(CSV_LOCATION)
author_ids, author_movements, places = process_scholar_files(CSV_LOCATION, csv_list, GEONAMES_USERNAME)

trajectories = get_trajectories(author_movements)
intersections = get_intersections(author_movements)


with codecs.open(AUTHOR_ID_JSON, 'w', 'utf8') as f:
    f.write(json.dumps(author_ids, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
    f.close()

with codecs.open(PLACES_JSON, 'w', 'utf8') as f:
    f.write(json.dumps(places, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
    f.close()

with codecs.open(TRAJECTORIES_JSON, 'w', 'utf8') as f:
    f.write(json.dumps(trajectories, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
    f.close()

with codecs.open(INTERSECTIONS_JSON, 'w', 'utf8') as f:
    f.write(json.dumps(intersections, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
    f.close()





# # not used, but potentially helpful code... maybe...

# from operator import itemgetter
# # sort all of the movements by the 'Earliest Known Date' key
# sorted_by_entry_date = sorted(author_movements[author_id], key= itemgetter('Earliest Known Date'))
# author_movements[author_id] = sorted_by_entry_date

# from dateutil import parser
# import datetime
# row['Earliest Year'] = parser.parse(row['Earliest Known Date']).date().year
# row['Earliest Month'] = parser.parse(row['Earliest Known Date']).date().month
# row['Last Year'] = parser.parse(row['Last Known Date']).date().year
# row['Last Month'] = parser.parse(row['Last Known Date']).date().month

# place_name = row['City'].lower().replace(' ', '_') + '_' + row['Country'].lower().replace(' ', '_')

# # alternative way to get longitude and latitude information
# from geopy.geocoders import Nominatim
# geolocator = Nominatim()
# location = geolocator.geocode(place_name)
# if location == None:
#     print(place_name, "not found.")
#     return None, None
# else:
#     return location.latitude, location.longitude