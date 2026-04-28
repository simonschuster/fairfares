
const ROUTES = [
  {from:"SFO",to:"LAX",low:49,mid:98,high:187,rt:1.4},
  {from:"SFO",to:"OAK",low:56,mid:113,high:217,rt:1.4},
  {from:"SFO",to:"SJC",low:59,mid:118,high:225,rt:1.4},
  {from:"SFO",to:"SAN",low:52,mid:105,high:200,rt:1.4},
  {from:"SFO",to:"SMF",low:49,mid:99,high:189,rt:1.4},
  {from:"SFO",to:"LAS",low:57,mid:114,high:219,rt:1.4},
  {from:"SFO",to:"PHX",low:60,mid:120,high:229,rt:1.4},
  {from:"SFO",to:"SLC",low:49,mid:99,high:189,rt:1.4},
  {from:"SFO",to:"SEA",low:59,mid:119,high:228,rt:1.4},
  {from:"SFO",to:"PDX",low:52,mid:104,high:200,rt:1.4},
  {from:"SFO",to:"DEN",low:89,mid:178,high:339,rt:1.5},
  {from:"SFO",to:"ORD",low:142,mid:284,high:541,rt:1.6},
  {from:"SFO",to:"JFK",low:189,mid:378,high:719,rt:1.7}
];

const CMAP = {
  "SAN FRANCISCO": "SFO",
  "LOS ANGELES": "LAX",
  "OAKLAND": "OAK",
  "SAN JOSE": "SJC",
  "SAN DIEGO": "SAN",
  "SACRAMENTO": "SMF",
  "LAS VEGAS": "LAS",
  "PHOENIX": "PHX",
  "SALT LAKE CITY": "SLC",
  "SEATTLE": "SEA",
  "PORTLAND": "PDX",
  "DENVER": "DEN",
  "CHICAGO": "ORD",
  "NEW YORK": "JFK",
  "LONDON": "LHR",
  "PARIS": "CDG",
  "TOKYO": "NRT"
};

const GT_RATES = {
  default: {base:3.00, mile:2.50, min:0.45, name:'standard metered rate'}
};
