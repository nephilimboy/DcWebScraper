const VERSION = '1.5.0';
var mysql = require('mysql');
var rest = require('restler');
var sreq = require('sync-request');
const $ = require('cheerio');
var is_connected_to_db = false;

const patchNoteUrl = "https://moot.us/lounges/73/boards/288";
const eventUrl = "https://moot.us/lounges/73/boards/281";
const webhookUrl = "xxxxxxxxxxxxxxx";
const webhookImg = "https://cdn.discordapp.com/attachments/476969405910089730/540991094209642498/kisspng-destiny-child-video-games-shift-up-corporation-the-big-imageboard-tbib-bodysuit-davi-destiny.png";
const webhookName = "Davi";


const DB_schema_name = 'dcEvents';
const con = mysql.createConnection({
    host: "xxxxxx",
    user: "xxxxxx",
    password: "xxxxxxxxx",
    charset: 'utf8mb4'
});

var App = {

    // Instance
    instance: {
        keepalive: {
            enabled: true,
            interval: 60
        }
    },

    // Run
    run: function () {
        /*
        Connect To DB and save event there
        */
        con.connect(function (err) {
            if (err) {
                console.log('update_events: There is a Problem -> ' + 'Cant connect to database');
                console.log(err);
                is_connected_to_db = false;
            }
            else {
                console.log("Connected to db");
                setInterval(function () {

                    var evtName = '';
                    var eventPostUrl = '';
                    var patchName = '';
                    var pathNotePostUrl = '';

                    rest.get(eventUrl).on('complete', function (data) {
                        var temp = $('.postItemClassic > a', data)[0]
                        evtName = $('div > div > .title > span', temp).text();
                        /*
                        for removing 'POPULAR' from string
                        ex: POPULARPetit Evolution Road -> Petit Evolution Road
                        */
                        if (evtName.indexOf('POPULAR') > -1) {
                            evtName = evtName.replace('POPULAR', '')
                        }
                        if (evtName.indexOf('BELIEBT') > -1) {
                            evtName = evtName.replace('BELIEBT', '')
                        }
                        eventPostUrl = "https://moot.us" + $('.postItemClassic > a', data)[0].attribs.href;

                        //_________________________________________________________________________________________________________
                        //Sec rest for Patch Notes
                        rest.get(patchNoteUrl).on('complete', function (data2) {
                            var temp = $('.postItemClassic > a', data2)[0]
                            patchName = $('div > div > .title > span', temp).text();
                            /*
                            for removing 'POPULAR' from string
                            ex: POPULARPetit Evolution Road -> Petit Evolution Road
                            */
                            if (patchName.indexOf('POPULAR') > -1) {
                                patchName = patchName.replace('POPULAR', '')
                            }
                            if (patchName.indexOf('BELIEBT') > -1) {
                                patchName = patchName.replace('BELIEBT', '')
                            }
                            pathNotePostUrl = "https://moot.us" + $('.postItemClassic > a', data2)[0].attribs.href;

                            //_________________________________________________________________________________________________________
                            //Check EvtName with Database Data
                            var sqlEvent = "SELECT * FROM " + DB_schema_name + ".events";
                            con.query(sqlEvent, function (err, rows, fields) {
                                if (err) {
                                    console.log(err);
                                    return;
                                }
                                // console.log(result);
                                var allRow = JSON.parse(JSON.stringify(rows));
                                Array.from(allRow).forEach(function (res) {
                                    //New Event
                                    if (res.name != evtName) {
                                        // send data to webhook
                                        // 1- send evt name
                                        var jsonData = {
                                            "username": webhookName,
                                            "avatar_url": webhookImg,
                                            "content": "***" + evtName + "***"
                                        }
                                        var res = sreq('POST', webhookUrl, {
                                            json: jsonData,
                                        });

                                        // 2- send evt url
                                        var jsonData = {
                                            "username": webhookName,
                                            "avatar_url": webhookImg,
                                            "content": eventPostUrl
                                        }
                                        var res = sreq('POST', webhookUrl, {
                                            json: jsonData,
                                        });

                                        // 3- send evt details
                                        rest.get(eventPostUrl).on('complete', function (data) {
                                            var final = [];
                                            var text = '';
                                            var dddd = $('.postBody > .bodyText', data).contents().map(function () {
                                                if ($(this).attr('class') === 'photoWidget') {
                                                    if (text != '' || text != null) {
                                                        final.push(text);
                                                        text = '';
                                                    }
                                                    final.push($('span > img', this).attr("src") + '\n')
                                                }
                                                else {

                                                    if (text.length > 1500) {
                                                        final.push(text);
                                                        text = '';
                                                    }
                                                    var temp = $(this).text().trim();
                                                    temp = temp.replace(/'/g, '');
                                                    text += temp + '\n';

                                                }
                                            }).get()

                                            if (text != '' || text != null) {
                                                final.push(text);
                                                text = '';
                                            }
                                            final.forEach(function (el) {
                                                var jsonData = {
                                                    "username": webhookName,
                                                    "avatar_url": webhookImg,
                                                    "content": el
                                                }
                                                var res = sreq('POST', webhookUrl, {
                                                    json: jsonData,
                                                });
                                            })
                                        });

                                        // remove previous event from database and save new one
                                        var sqlEventDel = "DELETE FROM " + DB_schema_name + ".events";
                                        con.query(sqlEventDel, function (err, rows, fields) {
                                            if (err) {
                                                console.log(err);
                                                return;
                                            }
                                            console.log('delete success');
                                            //save new one
                                            var sql = "INSERT INTO  " + DB_schema_name + ".events"
                                                + " ("
                                                + " " + 'name'
                                                + ")" + " VALUES " + "(" +
                                                " '" + evtName + "'" +
                                                ")";
                                            con.query(sql, function (err, result) {
                                                if (err) {
                                                    console.log('There is a Problem -> ' + 'Cant save event in database');
                                                    console.log(err);
                                                    return;
                                                }
                                                // console.log(result);
                                                console.log('Ay Ay -> ' + "event " + evtName + " saved into database");
                                            });
                                        });
                                    }

                                });

                            });
                            //_________________________________________________________________________________________________________
                            //Check PatchName with Database Data
                            var sqlEvent = "SELECT * FROM " + DB_schema_name + ".patch_notes";
                            con.query(sqlEvent, function (err, rows, fields) {
                                if (err) {
                                    console.log(err);
                                    return;
                                }
                                // console.log(result);
                                var allRow = JSON.parse(JSON.stringify(rows));
                                Array.from(allRow).forEach(function (res) {
                                    //New Event
                                    if (res.name != patchName) {
                                        // send data to webhook
                                        // 1- send evt name
                                        var jsonData = {
                                            "username": webhookName,
                                            "avatar_url": webhookImg,
                                            "content": "***" + patchName + "***"
                                        }
                                        var res = sreq('POST', webhookUrl, {
                                            json: jsonData,
                                        });

                                        // 2- send evt url
                                        var jsonData = {
                                            "username": webhookName,
                                            "avatar_url": webhookImg,
                                            "content": pathNotePostUrl
                                        }
                                        var res = sreq('POST', webhookUrl, {
                                            json: jsonData,
                                        });

                                        // 3- send evt details
                                        rest.get(pathNotePostUrl).on('complete', function (data) {
                                            var final = [];
                                            var text = '';
                                            var dddd = $('.postBody > .bodyText', data).contents().map(function () {
                                                if ($(this).attr('class') === 'photoWidget') {
                                                    if (text != '' || text != null) {
                                                        final.push(text);
                                                        text = '';
                                                    }
                                                    final.push($('span > img', this).attr("src") + '\n')
                                                }
                                                else {

                                                    if (text.length > 1500) {
                                                        final.push(text);
                                                        text = '';
                                                    }
                                                    var temp = $(this).text().trim();
                                                    temp = temp.replace(/'/g, '');
                                                    text += temp + '\n';

                                                }
                                            }).get()

                                            if (text != '' || text != null) {
                                                final.push(text);
                                                text = '';
                                            }
                                            final.forEach(function (el) {
                                                var jsonData = {
                                                    "username": webhookName,
                                                    "avatar_url": webhookImg,
                                                    "content": el
                                                }
                                                var res = sreq('POST', webhookUrl, {
                                                    json: jsonData,
                                                });
                                            })
                                        });

                                        // remove previous event from database and save new one
                                        var sqlEventDel = "DELETE FROM " + DB_schema_name + ".patch_notes";
                                        con.query(sqlEventDel, function (err, rows, fields) {
                                            if (err) {
                                                console.log(err);
                                                return;
                                            }
                                            console.log('delete success');
                                            //save new one
                                            var sql = "INSERT INTO  " + DB_schema_name + ".patch_notes"
                                                + " ("
                                                + " " + 'name'
                                                + ")" + " VALUES " + "(" +
                                                " '" + patchName + "'" +
                                                ")";
                                            con.query(sql, function (err, result) {
                                                if (err) {
                                                    console.log('There is a Problem -> ' + 'Cant save event in database');
                                                    console.log(err);
                                                    return;
                                                }
                                                // console.log(result);
                                                console.log('Ay Ay -> ' + "Patch " + patchName + " saved into database");
                                            });
                                        });
                                    }

                                });

                            });
                            //_________________________________________________________________________________________________________

                        });

                    });
                }, 20000);
            }
        });
    }
};


App.run();

var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", function () {
    console.log("Listening on Port 3000");
});





