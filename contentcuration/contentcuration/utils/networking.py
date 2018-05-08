import socket


def get_local_ip_address():
    return socket.gethostbyname(socket.gethostname())
