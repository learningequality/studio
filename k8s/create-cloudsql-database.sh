set -e

BRANCH=$1
PROJECT=$2

# Use instance `develop` when in project `studio`. Use instance `studio-qa`
# when in project `ops-central`
if [[ ${PROJECT} = "contentworkshop-159920" ]];
then
	INSTANCE="develop"
else
	INSTANCE="studio-qa"
fi

DATABASES=`gcloud sql databases list --instance=${INSTANCE} | awk '{print $1}' | tail -n +2`

EXISTENCE=False

for word in ${DATABASES}; do
    if [[ ${word} = ${BRANCH} ]];
    then
        echo "Database ${BRANCH} exists in SQL instance ${INSTANCE}."
        EXISTENCE=True
        break
    fi
done


if [[ ${EXISTENCE} = False ]];
then
    echo "Creating database ${BRANCH} in SQL instance ${INSTANCE}."
    gcloud sql databases create ${BRANCH} --instance=${INSTANCE}
fi
