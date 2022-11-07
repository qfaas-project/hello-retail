#! /bin/bash

echo 'Deploy MySQL to Kubernetes'
kubectl apply -f ./mysql/mysql-pv.yml
kubectl apply -f ./mysql/mysql-deployment.yml


echo 'Waiting 30s for MySQL to come up...'
sleep 30

echo 'Launch a MySQL client to setup helloRetail database in MySQL and Grant privileges'
kubectl run -n openfaas-fn --restart=Never --image=mysql:5.6 mysql-client-temp -- mysql -h mysql -ppass -e "CREATE USER 'abc'@'%' IDENTIFIED BY 'xyz'; CREATE DATABASE helloRetail; GRANT ALL PRIVILEGES ON helloRetail.* TO 'abc'@'%';"
echo 'Waiting 10s...'
sleep 10
kubectl delete -n openfaas-fn pod mysql-client-temp
echo 'Destroied the MySQL client'
echo 'Done!'