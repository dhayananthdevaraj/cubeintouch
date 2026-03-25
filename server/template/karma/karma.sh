#!/bin/bash
export NVM_DIR="/usr/local/nvm"  
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 14
export CHROME_BIN=/usr/bin/chromium
if [ ! -d "/home/coder/project/workspace/angularapp" ]
then
    cp -r /home/coder/project/workspace/karma/angularapp /home/coder/project/workspace/;
fi

if [ -d "/home/coder/project/workspace/angularapp" ]
then
    echo "project folder present"
    cp /home/coder/project/workspace/karma/karma.conf.js /home/coder/project/workspace/angularapp/karma.conf.js;
 
    # checking for donorformcomponent
 if [ -d "/home/coder/project/workspace/angularapp/src/app/donorform" ]
    then
        cp /home/coder/project/workspace/karma/donorform.component.spec.ts /home/coder/project/workspace/angularapp/src/app/donorform/donorform.component.spec.ts;
    else
        echo "should_create_donorform_component FAILED";
        echo "should_have_the_correct_heading FAILED";
        echo "should_display_success_message_on_submit FAILED";
        echo "should_display_all_labels FAILED";
        echo "should_have_a_donorForm FAILED";
        echo "should_have_a_name_control_in_donorForm FAILED";
        echo "should_have_an_age_control_in_donorForm FAILED";
        echo "should_have_a_gender_control_in_donorForm FAILED";
        echo "should_have_a_bloodGroup_control_in_donorForm FAILED";
        echo "should_have_a_lastDonatedDate_control_in_donorForm FAILED";
        echo "should_have_an_email_control_in_donorForm FAILED";
        echo "should_have_a_phone_control_in_donorForm FAILED";
    fi
 


    if [ -d "/home/coder/project/workspace/angularapp/node_modules" ];
    then
        cd /home/coder/project/workspace/angularapp/
        npm test;
    else
        cd /home/coder/project/workspace/angularapp/
        yes | npm install
        npm test
    fi
else  
        echo "should_create_donorform_component FAILED";
        echo "should_have_the_correct_heading FAILED";
        echo "should_display_success_message_on_submit FAILED";
        echo "should_display_all_labels FAILED";
        echo "should_have_a_donorForm FAILED";
        echo "should_have_a_name_control_in_donorForm FAILED";
        echo "should_have_an_age_control_in_donorForm FAILED";
        echo "should_have_a_gender_control_in_donorForm FAILED";
        echo "should_have_a_bloodGroup_control_in_donorForm FAILED";
        echo "should_have_a_lastDonatedDate_control_in_donorForm FAILED";
        echo "should_have_an_email_control_in_donorForm FAILED";
        echo "should_have_a_phone_control_in_donorForm FAILED";
fi