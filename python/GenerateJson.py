import os
import csv
import codecs
import json
from geopy import geocoders
from operator import itemgetter


## TO DO ##
## add State/Province/County information for location data ##


# ---------
# Settings
# ---------

CSV_LOCATION = os.getcwd() + '/raw-data/'
AUTHOR_ID_JSON = os.path.dirname(os.getcwd()) + '/data/three_author_ids.json'
ITINERARIES_JSON = os.path.dirname(os.getcwd()) + '/data/three_itineraries.json'
INTERSECTIONS_JSON = os.path.dirname(os.getcwd()) + '/data/three_intersections.json'
PLACES_JSON = os.path.dirname(os.getcwd()) + '/data/three_places.json'
GEONAMES_USERNAME = 'alyv'


# ----------
# Functions
# ----------

#-------------------------------------------------------------------------
# Returns a list of all the csv files in a directory
#-------------------------------------------------------------------------
def get_csv_list(csv_location):
    csv_list = []

    file_list = os.listdir(csv_location)
    for file in file_list:
        if file.lower().endswith('.csv'): csv_list.append(file)

    return csv_list


#-------------------------------------------------------------------------
# Returns the GeoNames latitude and longitude of the place name provided.
# If the place is not found, the function returns None for both longitude and latitude.
#-------------------------------------------------------------------------
def get_lat_long(place_name, geonames_username):
    gn = geocoders.GeoNames(username=geonames_username, timeout=None)
    location = gn.geocode(place_name,timeout=None)
    if location == None:
        print(place_name, "not found.")
        return None, None
    else:
        return location.latitude, location.longitude


# -------------------------------------------------------------------------
# Returns a dictionary of author ids (key is the author name and the value is their id)
# author_ids = { 'Aime Cesaire':'acesaire', 'Lydia Cabrera':'lcabrera', ...}
# Returns a dictionary of places
# places = { 'PlaceName': {'Lat': xxx, 'Long': yyy, 'Place ID': ##}, ... }
# Returns a dictionary each author movement
# author_movements =  { 'acesaire': [{'PlaceID':'paris_france', 'StartDate': ''}, {...}, ... ], 'lcabrera': [ {}...] , ... }
# The keys for each movement in the author_movements dictionary are as follows:
# PlaceID, Notes, EntryIndex, StartDate, StartType, StartCitation, EndDate, EndType, EndCitation
#-------------------------------------------------------------------------
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
                        movement['StartCitation'] = row['Citation 1']
                    elif not row['Earliest Presence'] == '': # start is earliest presence
                        movement['StartDate'] = row['Earliest Presence']
                        movement['StartType'] = 'earliest_presence'
                        movement['StartCitation'] = row['Citation 1']
                    else: # start unavailable
                        movement['StartDate'] = ''
                        movement['StartType'] = ''
                        movement['StartCitation'] = ''

                    # get the end date
                    if not row['Departure'] == '': # end is departure
                        movement['EndDate'] = row['Departure']
                        movement['EndType'] = 'departure'
                        movement['EndCitation'] = row['Citation 2']
                    elif not row['Latest Presence'] == '': # end is latest presence
                        movement['EndDate'] = row['Latest Presence']
                        movement['EndType'] = 'latest_presence'
                        movement['EndCitation'] = row['Citation 2']
                    else: # end unavailable
                        movement['EndDate'] =''
                        movement['EndType'] = ''
                        movement['EndCitation'] = ''

                    author_movements[author_id].append(movement)
                    row_index += 1

            csv_file.close()

    return author_ids, author_movements, places


#-------------------------------------------------------------------------
# Returns the earliest and latest dates in the data
#-------------------------------------------------------------------------
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


#-------------------------------------------------------------------------
# Returns a dictionary with keys for every year-month from the earliest
# year in the data to the latest year in the data, for example:
# date_dict = {'1899-01': [], '1899-02': [], ... , '1999-12': []}
#-------------------------------------------------------------------------
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


#-------------------------------------------------------------------------
# Returns a list of all of the year-month dates that a scholar was in a place
#-------------------------------------------------------------------------
def get_dates_in_place(earliest_date, latest_date):

    earliest_date_split = earliest_date.split('-')
    latest_date_split = latest_date.split('-')

    start_year = int(earliest_date_split[0])
    end_year = int(latest_date_split[0])

    if len(earliest_date_split) >= 2: start_month = int(earliest_date_split[1])
    else: start_month = 1

    if len(latest_date_split) >= 2: end_month = int(latest_date_split[1])
    else: end_month = 12

    dates_in_place = []
    for year in range(start_year, end_year + 1):
        if start_year == end_year:
            for month in range(start_month, end_month + 1):
                if month < 10: date = str(start_year) + '-0' + str(month)
                else: date = str(start_year) + '-' + str(month)
                dates_in_place.append(date)
            break

        if year == end_year:
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


#-------------------------------------------------------------------------
# Takes a string date and returns the year-month version of that date
# If the string provided has only a year, the month is January (01)
#-------------------------------------------------------------------------
def date_to_month_format(date):
    if not date == '':
        date_split = date.split('-')

        if len(date_split) >= 2: month = date_split[1]
        else: month = '01'

        date = date_split[0] + '-' + month  # year-month

    return date


#-------------------------------------------------------------------------
# Returns the dictionary for the itineraries json
#-------------------------------------------------------------------------
def get_itineraries(author_movements):
    itineraries = create_date_dict(author_movements)

    for author_id in author_movements:
        for movement in author_movements[author_id]:

            start_date = date_to_month_format(movement['StartDate'])
            end_date = date_to_month_format(movement['EndDate'])

            movement['AuthorID'] = author_id
            if not start_date == '':
                itineraries[start_date].append(movement)
            if not start_date == end_date and not end_date == '':
                itineraries[end_date].append(movement)

            # dates_in_place = get_dates_in_place(movement)
            # for date in dates_in_place:
            #     itineraries[date].append(itinerary_output)

    return itineraries


#-------------------------------------------------------------------------
# Creates the output for the intersections json
# If either the current_place and previous_place provided are of type None
# it does not list the author as in that place for the date range provided
#-------------------------------------------------------------------------
def populate_dates_in_place(from_date, to_date, current_place, current_movement, previous_place, previous_movement, likelihood, author_id, intersections):
    dates_in_place = get_dates_in_place(from_date, to_date)

    for date in dates_in_place:
        if not current_place == None:
            if not current_place in intersections[date]: intersections[date][current_place] = []
            current_movement['AuthorID'] = author_id
            current_movement['Likelihood'] = likelihood
            intersections[date][current_place].append(current_movement)

        if not previous_place == None:
            if not previous_place in intersections[date]: intersections[date][previous_place] = []
            previous_movement['AuthorID'] = author_id
            previous_movement['Likelihood'] = likelihood
            intersections[date][previous_place].append(previous_movement)

    return intersections


#-------------------------------------------------------------------------
# Processes each movement for the intersections json and assigns likelihood scores for each location.
# These comments are written using Lydia Cabrera as an example.
# Score of 3
# If we have both a start date and an end date for a given location,
# then Cabrera was very likely in that place from that start date through that end date,
# so she appears in that location throughout that date range with a likelihood score of 3.
#
# If we only have a start date or an end date for a given place, then we look at the previous row to help figure out
# Cabrera's likely locations and assign likelihood scores of 2 or 1 for where Cabrera could be, as follows:
#
# Score of 2
# If Cabrera had unterminated time in New York City (meaning an arrival, an earliest presence, or a latest presence),
# and then arrived in Miami, we say she was likely in New York City (with a score of 2) until her arrival in Miami.
# If Cabrera had a departure from Havana followed by an earliest presence, latest presence, or departure from Miami,
# we say she was likely in Miami (with a score of 2) from her Havana departure to her know date in Miami.
#
# Score of 1
# If it is possible that Cabrera could have been in any one of two places,
# then she placed in both locations with a likelihood score of 1 for each.
#-------------------------------------------------------------------------
def process_movement(previous_movement, current_movement, author_id, intersections):
    current_place = current_movement['PlaceID']

    # current movement has a start date and an end date
    if (not current_movement['StartDate'] == '') and (not current_movement['EndDate'] == ''):
        intersections = populate_dates_in_place(current_movement['StartDate'], current_movement['EndDate'],
                                                current_place, current_movement, None, None, 3, author_id, intersections)

    # current movement has either a start date or an end date
    elif not previous_movement == None: # not the first row in the CSV
        previous_place = previous_movement['PlaceID']

        # set the from_date and to_date
        if not previous_movement['EndDate'] == '': from_date = previous_movement['EndDate']
        else: from_date = previous_movement['StartDate']

        if not current_movement['EndDate'] == '': to_date = current_movement['EndDate']
        else: to_date = current_movement['StartDate']

        # put an author in place(s) with a likelihood score
        if current_movement['StartType'] == 'arrival' and not previous_movement['EndType'] == 'departure':
            intersections = populate_dates_in_place(from_date, to_date, None, None, previous_place, previous_movement, 2, author_id, intersections)

        elif not current_movement['StartType'] == 'arrival' and previous_movement['EndType'] == 'departure':
            intersections = populate_dates_in_place(from_date, to_date, current_place, current_movement, None, None, 2, author_id, intersections)

        elif not current_movement['StartType'] == 'arrival':
            intersections = populate_dates_in_place(from_date, to_date, current_place, current_movement, previous_place, previous_movement, 1, author_id, intersections)

    return intersections


#-------------------------------------------------------------------------
# Returns the dictionary for the intersections json
#-------------------------------------------------------------------------
def get_intersections(author_movements):
    intersections = create_date_dict(author_movements)
    for date in intersections: intersections[date] = {}

    for author_id in author_movements:
        # sort movements by EntryIndex
        sorted_by_entry_id = sorted(author_movements[author_id], key=itemgetter('EntryIndex'))

        previous_movement = None
        for current_movement in sorted_by_entry_id:
            intersections = process_movement(previous_movement, current_movement, author_id, intersections)
            previous_movement = current_movement

    # Remove places with no intersections... (where only one person in one place on a given date)
    # for date in list(intersections.keys()):
    #     for place in list(intersections[date].keys()):
    #         if len(intersections[date][place]) == 1:
    #             del intersections[date][place]

    return intersections


# ---------------
# Function calls
# ---------------

csv_list = get_csv_list(CSV_LOCATION)
author_ids, author_movements, places = process_scholar_files(CSV_LOCATION, csv_list, GEONAMES_USERNAME)

itineraries = get_itineraries(author_movements)
intersections = get_intersections(author_movements)

with codecs.open(AUTHOR_ID_JSON, 'w', 'utf8') as f:
    f.write(json.dumps(author_ids, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
    f.close()

with codecs.open(PLACES_JSON, 'w', 'utf8') as f:
    f.write(json.dumps(places, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
    f.close()

with codecs.open(ITINERARIES_JSON, 'w', 'utf8') as f:
    f.write(json.dumps(itineraries, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
    f.close()

with codecs.open(INTERSECTIONS_JSON, 'w', 'utf8') as f:
    f.write(json.dumps(intersections, sort_keys=True, indent=4, separators=(',', ': '), ensure_ascii=False))
    f.close()



#-------------------------------------------------------------------------
# Unused code (maybe, maybe helpful)
#-------------------------------------------------------------------------

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
