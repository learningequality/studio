import google.auth
import gspread


def colnum_string(n):
    """ colnum_string: get column letter
        Args: n (int) index of column to get letter for
        Returns: str letter(s) of column
    """
    string = ""
    while n > 0:
        n, remainder = divmod(n - 1, 26)
        string = chr(65 + remainder) + string
    return string


def get_credentials():
    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    credentials, _project = google.auth.default(scopes=scopes)
    return credentials


class GoogleClient():

    def __init__(self, *args, **kwargs):
        credentials = get_credentials()

        self.client = gspread.authorize(credentials)

    def get(self, spreadsheet_id):
        """ get: returns spreadsheet matching id
            Args: spreadsheet_id (str) ID of spreadsheet
            Returns: Spreadsheet (see https://github.com/burnash/gspread/blob/master/gspread/models.py#L77)
        """
        return self.client.open_by_key(spreadsheet_id)

    def get_length(self, worksheet):
        """ get_length: get number of non-empty rows in a worksheet
            Args: worksheet (Worksheet)
            Returns: number of rows

            Note: need to iterate through worksheet as all sheets automatically start with 1000 rows
            Start with the end of the list in case there are blank rows in the middle
        """
        values_list = worksheet.col_values(1)   # Get values from first column
        for idx, val in enumerate(reversed(values_list)):
            if val:
                return len(values_list) - idx


def add_row_to_sheet(sheet_id, values, worksheet=None):
    """ add_row_to_sheet: appends a row to a worksheet
        Args:
            sheet_id (str) Sheet id to append to
            values ([str]) List of values to write to row
            worksheet (Worksheet) Worksheet to append row to (if empty, appends to first worksheet)
        Returns: None
    """
    client = GoogleClient()                            # Open Google client to read from
    sheet = client.get(sheet_id)
    worksheet = worksheet or sheet.sheet1
    num_rows = client.get_length(worksheet)

    # Append row if reached the end of the worksheet
    # Otherwise, update the last row
    # Note: using this method as insert_row takes too long
    if num_rows + 1 > worksheet.row_count:
        worksheet.append_row(values)
    else:
        update_row = num_rows + 1

        # Get range of cells
        cell_list = worksheet.range('A{row}:{col}{row}'.format(row=update_row, col=colnum_string(worksheet.col_count)))

        for i, cell in enumerate(cell_list):
            if i >= len(values):
                break
            cell.value = values[i]

        worksheet.update_cells(cell_list)
