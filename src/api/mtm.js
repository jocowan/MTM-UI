import moment from 'moment';
import axios from 'axios';
import Song from '../entities/Song.js';
import SongRank from '../entities/SongRank.js';
import MediaItem from '../entities/MediaItem.js';
import ChartPosition from '../entities/ChartPosition.js';

const BASE_URL = "http://localhost:8888/api";

export default class MusicAPI {

  constructor() { }

  /**
   * Handles errors in request
   */
  static handleError = (error) => {
    var message = "Unreachable server error";
    if (error.response.data.errors[0] != undefined) {
      message = error.response.data.errors[0].details;
    }

    throw new Error(message);
  };

  /**
   * Get songs in the billboard chart in a given date
   * encodeURIComponent(sparqlQuery)
   */
  static getChart = (date) => {

    let BILLBOARD_URL = "http://localhost:9006/billboard/charts/" + date + "?filter=song";
    
    return axios.get(BILLBOARD_URL)
      .then(function (res) {

        let result = res.data;
        let chart = [];

        result.forEach((chartItem) => {
          chart.push(new ChartPosition(chartItem['rank'], chartItem['song_id'], chartItem['song_name'], chartItem['display_artist']));
        });

        return chart;
      })
      .catch(function (error) {
        MusicAPI.handleError(error);
      });
  };

  static getChart1 = (date) => {

    let query = `SELECT DISTINCT ?position ?name ?id ?name1 
    WHERE {
      ?Chart a schema:MusicPlaylist;
        schema:datePublished "${date}";
        schema:track ?ListItem0.
      ?ListItem0 a schema:ListItem;
        schema:item ?Song;
        schema:position ?position.
      ?Song a schema:MusicRecording;
        schema:name ?name;
        schema:byArtist ?Artist;
        billboard:id ?id.
      ?Artist a schema:MusicGroup;
        schema:name ?name1
    }`;
    let LRA_URL = "http://localhost:9000/api/lra/query?q=" + encodeURIComponent(query);
    
    return axios.get(LRA_URL)
      .then(function (res) {

        let result = res.data.table.rows;
        let chart = [];

        result.forEach((chartItem) => {
          chart.push(new ChartPosition(chartItem['?position'], chartItem['?id'], chartItem['?name'], chartItem['?name1']));
        });

        return chart;
      })
      .catch(function (error) {
        MusicAPI.handleError(error);
      });
  };

  /**
   * Get song information given an id
   */
  static getSongInfo = (id) => {
    let query = `SELECT DISTINCT ?name ?duration ?url ?artistName ?albumName ?albumRelease ?albumCoverImage 
    WHERE {
      ?MusicRecording a schema:MusicRecording;
        schema:name ?name;
        billboard:id "${id}";
        schema:byArtist ?MusicGroup;
        schema:inAlbum ?MusicAlbum;
        schema:duration ?duration;
        schema:url ?url.
      ?MusicGroup a schema:MusicGroup;
        schema:name ?artistName.
      ?MusicAlbum a schema:MusicAlbum;
        schema:name ?albumName;
        schema:albumRelease ?albumRelease;
        schema:image ?albumCoverImage
    }`;
    let LRA_URL = "http://localhost:9000/api/lra/query?q=" + encodeURIComponent(query);

    return axios.get(LRA_URL)

      .then(function (response) {

        let result = response.data.table.rows;

        let song = new Song(id, result.name, result.artistName,
                    result.albumName, result.albumRelease, result.duration,
                    result.url, result.albumCoverImage);

        return song;

      })
      .catch(function (error) {
        MusicAPI.handleError(error);
      });
  }

  /**
   * Get historical ranks of a song given an id
   */
  static getSongRankings = (id) => {
    let query = `SELECT DISTINCT ?date ?position 
    WHERE {
      ?MusicPlaylist a schema:MusicPlaylist;
        schema:track ?ListItem;
        schema:datePublished ?date.
      ?ListItem a schema:ListItem;
        schema:item ?MusicRecording;
        schema:position ?position.
      ?MusicRecording a schema:MusicRecording;
        billboard:id "${id}"
    }`;

    let LRA_URL = "http://localhost:9000/api/lra/query?q=" + encodeURIComponent(query);

    return axios.get(LRA_URL)
      .then(function (res) {
        let result = res.data.table.rows;
        let rankings = [];

        result.forEach((ranking) => {
          rankings.push(new SongRank(ranking.date, ranking.position));
        });

        return rankings;
      })
      .catch(function (error) {
        MusicAPI.handleError(error);
      });
  }

  /**
   * Get related media of a song given an id.
   */
  static getSongMedia = (id) => {
    let query = `SELECT DISTINCT ?url ?title ?thumbnailUrl 
    WHERE {
      ?MediaObject a schema:MediaObject;
        schema:url ?url;
        schema:name ?title;
        schema:image ?thumbnailUrl.
      ?MusicRecording a schema:MusicRecording;
        schema:subjectOf ?MediaObject;
        billboard:id "${id}"
    }`;
    let LRA_URL = "http://localhost:9000/api/lra/query?q=" + encodeURIComponent(query);

    return axios.get(LRA_URL)
      .then(function (response) {
        let result = response.data.table.rows;
        let media = [];

        result.forEach((mediaObj) => {
          media.push(new MediaItem(mediaObj.url, mediaObj.title,
            mediaObj.thumbnailURL));
        });

        return media;
      })
      .catch(function (error) {
        MusicAPI.handleError(error);
      });
  }
}