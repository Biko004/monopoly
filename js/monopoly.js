var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 150;
Monopoly.doubleCounter = 0;
Monopoly.playerBroke = false;


//Prepare the gameboard
Monopoly.init = function(){
    $(document).ready(function(){
        Monopoly.adjustBoardSize();
        $(window).bind("resize",Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
    });
};


//Print the money in console
Monopoly.justPrintMoney = function(){
    var player1 = $("#player1").attr("data-money");
    console.log("Player 1 money: " + player1);

    var player2 = $("#player2").attr("data-money");
    console.log("Player 2 money: " + player2);
};

//Show the intro popup
Monopoly.start = function(){
    Monopoly.showPopup("intro")
};

// Initializes the dice
Monopoly.initDice = function(){
    $(".dice").click(function(){
        if (Monopoly.allowRoll){
            Monopoly.rollDice();
        }
    });
};


//get the current player with .current-player class
Monopoly.getCurrentPlayer = function(){
    return $(".player.current-turn");
};

//get the player's cell
Monopoly.getPlayersCell = function(player){
    return player.closest(".cell");
};

// get the player's money amount
Monopoly.getPlayersMoney = function(player){
    return parseInt(player.attr("data-money"));
};

//update the player's money
Monopoly.updatePlayersMoney = function(player,amount){
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney < 0 ){
        Monopoly.playerBroke = true;
    }
    player.attr("data-money",playersMoney);
    player.attr("title",player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");
};

// randomize dice numbers and check if it's double
Monopoly.rollDice = function(){
    var result1 = Math.floor(Math.random() * 6) + 1 ;
    var result2 = Math.floor(Math.random() * 6) + 1 ;
    $(".dice").find(".dice-dot").css("opacity",0);
    $(".dice#dice1").attr("data-num",result1).find(".dice-dot.num" + result1).css("opacity",1);
    $(".dice#dice2").attr("data-num",result2).find(".dice-dot.num" + result2).css("opacity",1);
    console.log("dice One: " + result1);
    console.log("dice Two: " + result2);
    Monopoly.doubleCounter = 0;
    if (result1 == result2){
        Monopoly.doubleCounter++;
    }
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer,"move",result1 + result2);
};

// add happy smiley if player is on own property
Monopoly.mineProperty = function(player, cell){

    if (cell.attr("data-owner") == player.attr("id")){
        player.addClass("smile");
    }
    else{
        player.removeClass("smile");
    }
};
// move the player around step by step
Monopoly.movePlayer = function(player,steps){
    Monopoly.allowRoll = false;
    var playerMovementInterval = setInterval(function(){
        if (steps == 0){
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
        }else {
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            Monopoly.mineProperty(player, nextCell);

            nextCell.find(".content").append(player);
            steps--;
        }
    },200);
};

// handle !
Monopoly.handleTurn = function(){
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")){
        Monopoly.handleBuyProperty(player,playerCell);
    }else if(playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))){
         Monopoly.handlePayRent(player,playerCell);
    }else if(playerCell.is(".go-to-jail")){
        Monopoly.handleGoToJail(player);
    }else if(playerCell.is(".chance")){
        Monopoly.handleChanceCard(player);
    }else if(playerCell.is(".community")){
        Monopoly.handleCommunityCard(player);
    }else{
        Monopoly.setNextPlayerTurn();
    }
}
// if user is broke, handle remove player
Monopoly.handleRemovePlayer = function(player){

    $(".property").each(function(){
        if ($(this).hasClass(player.attr("id"))){
            $(this).removeClass(player.attr("id"))
                .addClass("available")
                .removeAttr("data-owner")
                .removeAttr("data-rent");
        }
    });
};

// set the next player's turn
Monopoly.setNextPlayerTurn = function(){
    if(Monopoly.doubleCounter !=1){
        var currentPlayerTurn = Monopoly.getCurrentPlayer();
        var playerId = parseInt(currentPlayerTurn.attr("id").replace("player",""));
        var nextPlayerId = playerId + 1;
        if (nextPlayerId > $(".player").length){
            nextPlayerId = 1;
        }
        while($("#player" + nextPlayerId).hasClass("lost")){
            nextPlayerId++;
        }


        currentPlayerTurn.removeClass("current-turn");
        var nextPlayer = $(".player#player" + nextPlayerId);
        nextPlayer.addClass("current-turn");
        if (nextPlayer.is(".jailed")){
            var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
            currentJailTime++;
            nextPlayer.attr("data-jail-time",currentJailTime);
            if (currentJailTime > 3){
                nextPlayer.removeClass("jailed");
                nextPlayer.removeAttr("data-jail-time");
                nextPlayer.removeClass("isinjail");
            }
            Monopoly.setNextPlayerTurn();
            return;
        }
    }

    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};


// handle buying property
Monopoly.handleBuyProperty = function(player,propertyCell){
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click",function(){
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")){
            Monopoly.handleBuy(player,propertyCell,propertyCost);
        }else{
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};


// handle rent if player step on another player's property
Monopoly.handlePayRent = function(player,propertyCell){
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click",function(){
        var properyOwner = $(".player#"+ properyOwnerId);
        Monopoly.updatePlayersMoney(player,currentRent);
        Monopoly.updatePlayersMoney(properyOwner,-1*currentRent);
        Monopoly.closeAndNextTurn();
    });
   Monopoly.showPopup("pay");
};

// if player go to jail do this
Monopoly.handleGoToJail = function(player){
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click",function(){
        Monopoly.handleAction(player,"jail");
    });
    Monopoly.showPopup("jail");
};

// handle chance card
Monopoly.handleChanceCard = function(player){
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function(chanceJson){
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",chanceJson["action"]).attr("data-amount",chanceJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("chance");
};


//handle community card
Monopoly.handleCommunityCard = function(player){
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function(communityJson){
        popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
        popup.find(".popup-title").text(communityJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",communityJson["action"]).attr("data-amount",communityJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("community");
};

// send player to jail
Monopoly.sendToJail = function(player){
    player.addClass("jailed");
    player.addClass("isinjail");
    player.attr("data-jail-time",1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

// create popup according to #id
Monopoly.getPopup = function(popupId){
    return $(".popup-lightbox .popup-page#" + popupId);
};

// calculate property cost
Monopoly.calculateProperyCost = function(propertyCell){
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group","")) * 5;
    if (cellGroup == "rail"){
        cellPrice = 10;
    }
    return cellPrice;
};

// calculate property rent price
Monopoly.calculateProperyRent = function(propertyCost){
    return propertyCost/2;
};

// close the popup and call for next player turn function
Monopoly.closeAndNextTurn = function(){
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

// intro popup
Monopoly.initPopups = function(){
    $(".popup-page#intro").find("button").click(function(){
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers",numOfPlayers)){
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};

// handle if player want to buy a property
Monopoly.handleBuy = function(player,propertyCell,propertyCost){
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost){
        Monopoly.playSound("zeropoint");
        Monopoly.showErrorMsg();
    }else{
        Monopoly.updatePlayersMoney(player,propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);
        player.addClass("smile");
        propertyCell.removeClass("available")
                    .addClass(player.attr("id"))
                    .attr("data-owner",player.attr("id"))
                    .attr("data-rent",rent);
        Monopoly.setNextPlayerTurn();
    }
};

//if user is broke show popup and add LOST class. hide player
Monopoly.playerIsBroke = function(){
    Monopoly.playerBroke = false;
    Monopoly.closePopup();
    var popup = Monopoly.getPopup("broke");
    popup.find("button").unbind("click").bind("click",function(){

        var brokePlayer = Monopoly.getCurrentPlayer();
        brokePlayer.addClass("lost")
            .attr("data-money", "")
            .hide();

        Monopoly.handleRemovePlayer(brokePlayer);
        Monopoly.closeAndNextTurn();
    });

    Monopoly.showPopup("broke");
};

// deal if the player is moving, paying or being jailed
Monopoly.handleAction = function(player,action,amount){
    console.log(action)
    switch(action){
        case "move":
            Monopoly.movePlayer(player,amount);
             break;
        case "pay":
            Monopoly.updatePlayersMoney(player,amount);
            if(Monopoly.playerBroke){
                Monopoly.playerIsBroke(player);
                return;
            }
            Monopoly.setNextPlayerTurn();

            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
    };
    Monopoly.closePopup();
};




// create players for game based on user input (between 1-4 only)
Monopoly.createPlayers = function(numOfPlayers){
    var startCell = $(".go");
    for (var i=1; i<= numOfPlayers; i++){
        var player = $("<div />").addClass("player shadowed").attr("id","player" + i).attr("title","player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i==1){
            player.addClass("current-turn");
        }
        player.attr("data-money",Monopoly.moneyAtStart);
    }
};

// helps to move the player around the board
Monopoly.getNextCell = function(cell){
    var currentCellId = parseInt(cell.attr("id").replace("cell",""));
    var nextCellId = currentCellId + 1;
    if (nextCellId > 40){
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

// when user pass the GO corner do this
Monopoly.handlePassedGo = function(){
    var player = Monopoly.getCurrentPlayer();
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney += 10;
    player.attr("data-money",playersMoney);
    player.attr("title",player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");
};

// check if the user input for Num of Players is valid
Monopoly.isValidInput = function(validate,value){
    var isValid = false;
    switch(validate){
        case "numofplayers":
            if(value > 1 && value <= 4){
                isValid = true;
            }
            break;
    }

    if (!isValid){
        Monopoly.showErrorMsg();
    }
    return isValid;

}

// show error msg!
Monopoly.showErrorMsg = function(){
    Monopoly.playSound("zeropoint");
    $(".popup-page .invalid-error").fadeTo(500,1);
    setTimeout(function(){
            $(".popup-page .invalid-error").fadeTo(500,0);
    },2000);
};

// adjust board size according to user window size
Monopoly.adjustBoardSize = function(){
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(),$(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) *2;
    $(".board").css({"height":boardSize,"width":boardSize});
};

// close popup
Monopoly.closePopup = function(){
    $(".popup-lightbox").fadeOut();
};

// Play sound!
Monopoly.playSound = function(sound){
    var snd = new Audio("./sounds/" + sound + ".wav"); 
    snd.play();
};

// Show popup
Monopoly.showPopup = function(popupId){
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};


Monopoly.init();