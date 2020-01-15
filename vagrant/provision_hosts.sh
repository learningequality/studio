#!/bin/bash

if [ -e /etc/hosts.backup ]
then
  cp /etc/hosts.backup /etc/hosts
else
  cp /etc/hosts /etc/hosts.backup
fi

{
  echo "";
  echo "# Vagrant entries below";
  echo "# =====================";
  echo "";
} >> /etc/hosts

for host in "$@"
do
  ip_addr="${!host}"
  echo "$ip_addr $host=${!host}" >> /etc/hosts
done
