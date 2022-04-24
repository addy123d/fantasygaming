
function declareWinner(Players){
      Players.sort(pricecompare_1);
  
  
    console.log("After sorting: ");
    console.log(Players);
  
    return Players; 
  }
  
  function pricecompare_1( a, b ) {
      if ( a.points > b.points ){
        return -1;
      }
      if ( a.points < b.points ){
        return 1;
      }
      return 0;
  }
  
  module.exports = declareWinner;