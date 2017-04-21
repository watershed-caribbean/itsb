import csv
import json

def exportFile(_file):

	f = open(_file + '.csv')
	f_r = csv.reader(f)
	new = []

	for row in f_r:
		new.append([row[0],row[1],row[2],row[3]])
	new.pop(0)

	jsonarr = []
	for r in new:
		str_place = '"' + r[2] + "_" + r[3] + '"'
		str_whole = str_place + ":" + "[" + r[1] +"," + r[0] + "]"
		jsonarr.append(str_whole)

	jsonstr = ',\n'.join(jsonarr)
	jsonstr = "{\n" + jsonstr + "\n}"

	jsonexp = open('places.json','w')
	jsonexp.write(jsonstr);
	jsonexp.close();

csv_file = 'places_GEOCODED'
exportFile(csv_file)
