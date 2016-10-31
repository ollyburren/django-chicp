'''
Created on 19 Oct 2016

@author: oliver
'''

import re


def guessDelimiter(blines):
    ''' I think that blines is passed by reference'''
    lineCount = 0
    for l in blines:
        lineCount += 1
        # print(str(lineCount) + ':::' + l)
        if re.match('\s*#', l):
            # print('===Found a comment')
            continue
        if re.search('\t', l):
            # print("===Delimiter is tab")
            return("\t")
        if re.search('\s', l):
            # print("====Delimiter is space")
            return(' ')
    return('')  # this indicates that we are unable to guess the delimiter


def validateBed(blines, delimiter='\t', stopAtLine=1000):
    lineCount = 1
    strError = ''
    # if stopAtLine is zero then check the complete file
    if stopAtLine == 0:
        stopAtLine = len(blines)
    print("Checking " + str(stopAtLine) + " lines of bed file")
    for l in blines:
        stopAtLine -= 1
        if re.match('\s*#', l):
            # if a comment add to stopAtLine
            stopAtLine += 1
            lineCount += 1
            continue
        vals = re.split(delimiter, l)
        if len(vals) != 5:
            strError = "Incorrect number of elements at line:" + str(lineCount) + " got " +\
                str(len(vals)) + "BED5 has 5 columns"
            return(False, strError)
        # check that cols look correct
        if not re.match("^chr[0-9XY]+|[0-9XY]", vals[0]):
            strError = "Incorrect chr(col1) assignment at line: " + str(lineCount) + " got " + vals[0]
            return(False, strError)
        # 2 and 3 should be integers
        if not re.match("^[0-9]+$", vals[1]):
            strError = "Incorrect start(col2) assignment at line: " + str(lineCount) + " got " + vals[1]
            return(False, strError)
        if not re.match("^[0-9]+$", vals[2]):
            strError = "Incorrect end(col3) assignment at line: " + str(lineCount) + " got " + vals[2]
            return(False, strError)
        # 3 can be anything so no point in checking
        # finally score should be a number
        if not re.match("^[0-9.]+$", vals[4]):
            strError = "Incorrect score(col5) assignment at line:" + str(lineCount) + " got " + vals[4]
            return(False, strError)
        if stopAtLine == 0:
            break
        lineCount += 1
    return(True, strError)


if __name__ == '__main__':
    import sys
    bedlines = open(sys.argv[1]).read().splitlines()
    delim = guessDelimiter(bedlines)
    if delim == '':
        print("Could not guess delimiter return invalid bed")
    else:
        out = validateBed(bedlines, delim)
        print(out)
