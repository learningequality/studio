def format_size(value):
    B = float(value)
    KB = float(1024)
    MB = float(KB ** 2) # 1,048,576
    GB = float(KB ** 3) # 1,073,741,824
    TB = float(KB ** 4) # 1,099,511,627,776

    if B < KB:
        return '{0}'.format(B), 'B'
    elif KB <= B < MB:
        return '{0:.2f}'.format(B/KB), 'KB'
    elif MB <= B < GB:
        return '{0:.2f}'.format(B/MB), 'MB'
    elif GB <= B < TB:
        return '{0:.2f}'.format(B/GB), 'GB'
    elif TB <= B:
        return '{0:.2f}'.format(B/TB), 'TB'