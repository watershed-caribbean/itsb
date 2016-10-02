import os
import csv
import codecs
import json
from geopy import geocoders


# ---------
# Settings
# ---------

CSV_LOCATION = os.getcwd() + '/raw-data/'
AUTHOR_ID_JSON = os.path.dirname(os.getcwd()) + '/data/test_author_ids.json'
ITINERARIES_JSON = os.path.dirname(os.getcwd()) + '/data/test_itineraries.json'
INTERSECTIONS_JSON = os.path.dirname(os.getcwd()) + '/data/test_intersections.json'
PLACES_JSON = os.path.dirname(os.getcwd()) + '/data/test_places.json'
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
# Returns a dictionary of places
# places = { 'PlaceName': {'Lat': xxx, 'Long': yyy, 'Place ID': ##}, ... }
# Returns a dictionary each author movement
# author_movements =  { 'acesaire': [{'PlaceID':'paris_france', 'StartDate': ''}, {...}, ... ], 'lcabrera': [ {}...] , ... }
def process_scholar_files(csv_path, csv_list, geonames_username):
    author_ids = {}
    author_movements = {}
    places = {}

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
                if not(row['Arrival'] == '' and row['Departure'] == '' and row['Earliest Presence'] == '' and row['Latest Presence'] == ''):

                    place_name = row['City'] + ', ' + row['Country']
                    if not place_name in places:
                        place_info = {}

                        lat, long = get_lat_long(place_name, geonames_username)
                        place_info['Lat'] = lat
                        place_info['Long'] = long

                        place_id = row['City'].lower().replace(' ', '-') + '_' + row['Country'].lower().replace(' ', '-')
                        place_info['PlaceID'] = place_id

                        places[place_name] = place_info

                    movement = {}
                    movement['PlaceID'] = places[place_name]['PlaceID']
                    movement['Notes'] = row['Notes']
                    movement['EntryIndex'] = row_index

                    # get the start date
                    if not row['Arrival'] == '': # start is arrival
                        movement['StartDate'] = row['Arrival']
                        movement['StartType'] = 'arrival'
                        movement['StartCitation'] = row['Arrival Citation']
                    elif not row['Earliest Presence'] == '': # start is earliest presence
                        movement['StartDate'] = row['Earliest Presence']
                        movement['StartType'] = 'earliest_presence'
                        movement['StartCitation'] = row['Earliest Presence Citation']
                    else: # start unavailable
                        movement['StartDate'] = ''
                        movement['StartType'] = ''
                        movement['StartCitation'] = ''

                    # get the end date
                    if not row['Departure'] == '': # end is departure
                        movement['EndDate'] = row['Departure']
                        movement['EndType'] = 'departure'
                        movement['EndCitation'] = row['Departure Citation']
                    elif not row['Latest Presence'] == '': # end is latest presence
                        movement['EndDate'] = row['Latest Presence']
                        movement['EndType'] = 'latest_presence'
                        movement['EndCitation'] = row['Latest Presence Citation']
                    else: # end unavailable
                        movement['EndDate'] =''
                        movement['EndType'] = ''
                        movement['EndCitation'] = ''

                    author_movements[author_id].append(movement)
                    row_index += 1

            csv_file.close()

    return author_ids, author_movements, places


# ... author_movements dictionary items ...
# PlaceID
# Notes
# EntryIndex
# StartDate
# StartType
# StartCitation
# EndDate
# EndType
# EndCitation


# Returns the earliest and latest dates in the data
def get_earliest_and_latest_dates(author_movements):
    start_dates = []
    end_dates = []

    for author_id in author_movements:
        for movement in author_movements[author_id]:
            start_date = movement['StartDate']
            end_date = movement['EndDate']

            if not start_date == '': start_dates.append(start_date)
            if not end_date == '': end_dates.append(end_date)

    start_dates = sorted(start_dates)
    end_dates = sorted(end_dates)

    return start_dates[0], end_dates[len(end_dates)-1]


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


# Returns a list of all of the year-month dates that a scholar was in a place
def get_dates_in_place(movement):
    dates_in_place = []

    earliest_date_split = movement['StartDate'].split('-')
    latest_date_split = movement['EndDate'].split('-')

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


def dates_to_month_format(movement):
    start_date = movement['StartDate']
    if not start_date == '':
        start_date_split = start_date.split('-')

        if len(start_date_split) >= 2: start_month = start_date_split[1]
        else: start_month = '01'

        start_date = start_date_split[0] + '-' + start_month  # year-month

    end_date = movement['EndDate']
    if not end_date == '':
        end_date_split = end_date.split('-')

        if len(end_date_split) >= 2: end_month = end_date_split[1]
        else: end_month = '12'

        end_date = end_date_split[0] + '-' + end_month # year-month

    return start_date, end_date


# Returns the dictionary for the itineraries json
def get_itineraries(author_movements):
    itineraries = create_date_dict(author_movements)

    for author_id in author_movements:
        for movement in author_movements[author_id]:

            itinerary_output = {}
            itinerary_output['AuthorID'] = author_id
            itinerary_output['EntryIndex'] = movement['EntryIndex']
            itinerary_output['PlaceID'] = movement['PlaceID']
            itinerary_output['Notes'] = movement['Notes']

            # original date information (not necessarily in month format)
            itinerary_output['StartDate'] = movement['StartDate']
            itinerary_output['StartType'] = movement['StartType']
            itinerary_output['StartCitation'] = movement['StartCitation']
            itinerary_output['EndDate'] = movement['EndDate']
            itinerary_output['EndType'] = movement['EndType']
            itinerary_output['EndCitation'] = movement['EndCitation']

            start_date, end_date = dates_to_month_format(movement)

            if not start_date == '': itineraries[start_date].append(itinerary_output)
            if not end_date == '': itineraries[end_date].append(itinerary_output)

            # dates_in_place = get_dates_in_place(movement)
            # for date in dates_in_place:
            #     itineraries[date].append(itinerary_output)

    return itineraries


# Returns the dictionary for the intersections json
def get_intersections(author_movements):
    intersections = create_date_dict(author_movements)
    for date in intersections: intersections[date] = {}

    for author_id in author_movements:
        for movement in author_movements[author_id]:

            # only for dates with a start and end
            if not movement['StartDate'] == '' and not movement['EndDate'] == '':

                dates_in_place = get_dates_in_place(movement)
                place_id = movement['PlaceID']

                for date in dates_in_place:
                    if not place_id in intersections[date]: intersections[date][place_id] = []

                    intersection_output = {}
                    intersection_output['AuthorID'] = author_id
                    # # ADD certainty

                    intersections[date][place_id].append(intersection_output)

    # Remove places with no intersections... (where only one person in one place on a given date)
    for date in list(intersections.keys()):
        for place in list(intersections[date].keys()):
            if len(intersections[date][place]) == 1:
                del intersections[date][place]


    return intersections



# ---------------
# Function calls
# ---------------

csv_list = get_csv_list(CSV_LOCATION)
author_ids, author_movements, places = process_scholar_files(CSV_LOCATION, csv_list, GEONAMES_USERNAME)

itineraries = get_itineraries(author_movements)

# intersections = get_intersections(author_movements)



# with codecs.open(AUTHOR_ID_JSON, 'w', 'utf8') as f:
#     f.write(json.dumps(author_ids, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
#     f.close()
#
# with codecs.open(PLACES_JSON, 'w', 'utf8') as f:
#     f.write(json.dumps(places, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
#     f.close()
#
# with codecs.open(ITINERARIES_JSON, 'w', 'utf8') as f:
#     f.write(json.dumps(itineraries, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
#     f.close()
#
# with codecs.open(INTERSECTIONS_JSON, 'w', 'utf8') as f:
#     f.write(json.dumps(intersections, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
#     f.close()












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


# # alternative way to get longitude and latitude information
# from geopy.geocoders import Nominatim
# geolocator = Nominatim()
# location = geolocator.geocode(place_name)
# if location == None:
#     print(place_name, "not found.")
#     return None, None
# else:
#     return location.latitude, location.longitude