const ROUTES=[
  {from:"SFO",to:"LAX",low:49,mid:98,high:187,rt:1.4},
  {from:"SFO",to:"OAK",low:56,mid:113,high:217,rt:1.4},
  {from:"SFO",to:"SJC",low:59,mid:118,high:225,rt:1.4},
  // ... (Full data list follows in your original file)
];

const GT_RATES={
  default:{base:3.00,mile:2.50,min:0.45,name:'standard metered rate'},
  sf:{base:3.50,mile:2.75,min:0.55,name:'San Francisco MTA metered rate'},
  la:{base:3.10,mile:2.70,min:0.35,name:'Los Angeles City metered rate'},
  // ... (Full city list follows in your original file)
};