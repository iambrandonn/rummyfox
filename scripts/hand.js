/* global app */
/* exported Hand */

function Hand(cards, computer) {
  this.cards = cards;
  this.isComputer = computer;
  this.isPretend = false; // When testing for valid melds, we create some pretend hands

  this.getScore = function() {
    var score = 0;
    for (var cardIndex in this.cards) {
      if (this.cards[cardIndex].numericRank > 9) {
        score += 10;
      }
      else {
        score += this.cards[cardIndex].numericRank;
      }
    }

    return score;
  };

  this.order = function() {
    // order by rank
    if (Array.isArray(this.cards)) {
      this.cards.sort(function(a, b) {
        if (a.numericRank > b.numericRank) {
          return 1;
        }
        else if (a.numericRank === b.numericRank) {
          return a.suit < b.suit;
        }
        else {
          return -1;
        }
      });
    }
  };

  this.layout = function() {
    var isOdd = (this.cards.length & 1) === 1;
    var ANGLE_BETWEEN_CARDS = 3;
    var cardsOnEachSide;
    var xValue;
    var yValue;
    var angle;
    var curZindex = 10;

    if (isOdd) {
      cardsOnEachSide = (this.cards.length - 1) / 2;

      if (this.isComputer) {
        angle = ANGLE_BETWEEN_CARDS * cardsOnEachSide;
      }
      else {
        angle = -ANGLE_BETWEEN_CARDS * cardsOnEachSide;
      }
    }
    else {
      cardsOnEachSide = (this.cards.length) / 2;

      if (this.isComputer) {
        angle = ANGLE_BETWEEN_CARDS * cardsOnEachSide - (ANGLE_BETWEEN_CARDS / 2);
      }
      else {
        angle = -ANGLE_BETWEEN_CARDS * cardsOnEachSide + (ANGLE_BETWEEN_CARDS / 2);
      }
    }

    xValue = (app.screenWidth * app.handsCenteredOn)  - (app.cardWidth / 2); // Find starting point

    if (this.isComputer) {
      yValue = app.opponentY;
    }
    else {
      yValue = app.playerY;
    }

    for (var i = 0; i < this.cards.length; i++) {
      this.cards[i].updateLayout(xValue, yValue, angle);

      if (this.isComputer) {
        angle -= ANGLE_BETWEEN_CARDS;
        this.cards[i].hide();
        this.cards[i].setComputerHand();
      }
      else {
        angle += ANGLE_BETWEEN_CARDS;
        this.cards[i].show();
        this.cards[i].setPlayerHand();
      }

      this.cards[i].setZ(curZindex++);
    }
  };

  this.layDownMelds = function() {
    var setLayedDown = this.layDownSets();
    var runLayedDown = this.layDownRuns();
    var additions = false;
    while (this.layDownAdditions()) {
      additions = true;
    }

    return setLayedDown || runLayedDown || additions;
  };

  this.layDownAdditions = function() {
    var result = false;

    var isSetMeld = function(meld) {
      return meld[0].numericRank === meld[1].numericRank;
    };

    for (var cardIndex = 0; cardIndex < this.cards.length; cardIndex++) {
      for (var meldIndex in app.game.melds) {
        var card = this.cards[cardIndex];
        var meld = app.game.melds[meldIndex];
        var removed = false;

        if (isSetMeld(meld)) {
          if (card.numericRank === meld[0].numericRank) {
            removed = true;
            if (!this.isPretend) {
              meld.push(card);
            }
          }
        }
        else {
          if (meld[0].suit === card.suit) {
            if (meld[0].numericRank - 1 === card.numericRank) {
              removed = true;
              meld.unshift(card);
            }
            else if (meld[meld.length - 1].numericRank + 1 === card.numericRank) {
              removed = true;
              if (!this.isPretend) {
                meld.push(card);
              }
            }
          }
        }

        if (removed) {
          this.cards.splice(cardIndex, 1);
          cardIndex--;
          result = true;
          break;
        }
      }
    }

    return result;
  };

  this.getSetLength = function(startIndex) {
    var length = 1;
    var currentIndex = startIndex + 1;
    while (currentIndex < this.cards.length && this.cards[currentIndex].rank === this.cards[startIndex].rank) {
      length++;
      currentIndex++;
    }

    return length;
  };

  this.indexOf = function(suit, numericRank) {
    for (var i = 0; i < this.cards.length; i++) {
      if (this.cards[i].suit === suit && this.cards[i].numericRank === numericRank) {
        return i;
      }
    }

    return -1;
  };

  this.cardIsPartOfRun = function(index) {
    var result = [];

    var offset = 1;
    var theCard = this.cards[index];

    var place = index;

    do {
      result.push(place);
      place = this.indexOf(theCard.suit, theCard.numericRank + offset);
      offset++;
    } while (place >= 0);

    return result;
  };

  this.getPotentialRuns = function(index) {
    var result = [index];
    var theCard = this.cards[index];

    var downward = this.indexOf(theCard.suit, theCard.numericRank - 1);
    var upward = this.indexOf(theCard.suit, theCard.numericRank + 1);
    if (downward >= 0) {
      result.unshift(downward);
    }
    if (upward >= 0) {
      result.push(upward);
    }

    return result;
  };

  this.getPotentialSets = function(index) {
    var result = [];
    var theCard = this.cards[index];

    for (var i = 0; i < this.cards.length; i++) {
      if (this.cards[i].numericRank === theCard.numericRank) {
        result.push(i);
      }
    }

    return result;
  };

  this.getPotentialNonContRuns = function(index) {
    var result = [index];
    var theCard = this.cards[index];

    var downward = this.indexOf(theCard.suit, theCard.numericRank - 2);
    var upward = this.indexOf(theCard.suit, theCard.numericRank + 2);
    if (downward >= 0) {
      result.unshift(downward);
    }
    if (upward >= 0) {
      result.push(upward);
    }

    return result;
  };

  this.layDownSets = function() {
    var result = false;

    // look at each card
    for (var i = 0; i < this.cards.length; i++) {
      var length = this.getSetLength(i);
      if (length > 2) {
        var removed = this.cards.splice(i, length);
        this.layDownMeld(removed);
        result = true;
      }
    }

    return result;
  };

  this.layDownRuns = function() {
    var result = false;

    // look at each card
    for (var i = 0; i < this.cards.length; i++) {
      var run = this.cardIsPartOfRun(i);

      if (run.length > 2) {
        var removed = [];
        for (var runCardIndex = run.length - 1; runCardIndex >= 0; runCardIndex--) {
          var card = this.cards.splice(run[runCardIndex], 1)[0];
          removed.unshift(card);
        }
        this.layDownMeld(removed);
        result = true;
      }
    }

    return result;
  };

  this.layDownMeld = function(cardsToLayDown) {
    if (!this.isPretend) {
      app.game.melds.push(cardsToLayDown);
    }
  };

  this.addCard = function(card) {
    this.cards.push(card);
    this.order();
  };

  this.hasThisNumberCard = function(card) {
    return this.indexOf('heart', card.numericRank) >= 0 ||
      this.indexOf('diamond', card.numericRank) >= 0 ||
      this.indexOf('club', card.numericRank) >= 0 ||
      this.indexOf('spade', card.numericRank) >= 0;
  };

  this.hasCardNearThis = function(card) {
    return this.indexOf(card.suit, card.numericRank - 1) >= 0 ||
      this.indexOf(card.suit, card.numericRank + 1) >= 0;
  };

  this.wouldResultInMeld = function(card) {
    // Make new fake hand with the card added
    var fakeHand = new Hand(this.cards.concat([card]));
    fakeHand.isPretend = true;
    fakeHand.order();
    var result = fakeHand.layDownMelds();
    fakeHand = null;
    return result;
  };

  this.getWorth = function(index) {
    var lookingFor = [];
    var worth = 0;
    var candidates = 0;
    var theCard = this.cards[index];

    var updateCandidateBasedOnUsed = function(candidates, cardsLookingFor) {
      var newCandidates = candidates;
      var lookingIndex;
      var discardCard, meldCard;

      // Look for unavailable cards of same numericRank
      for (var discardIndex in app.game.discards) {
        discardCard = app.game.discards[discardIndex];
        for (lookingIndex in cardsLookingFor) {
          if (
            discardCard.numericRank === cardsLookingFor[lookingIndex].numericRank &&
            discardCard.suit === cardsLookingFor[lookingIndex].suit
          ) {
            newCandidates--;
          }
        }
      }

      // Look for unavailable cards of same numericRank
      for (var meldIndex in app.game.melds) {
        for (var cardIndex in app.game.melds[meldIndex]) {
          meldCard = app.game.melds[meldIndex][cardIndex];
          for (lookingIndex in cardsLookingFor) {
            if (
              meldCard.numericRank === cardsLookingFor[lookingIndex].numericRank &&
              meldCard.suit === cardsLookingFor[lookingIndex].suit
            ) {
              newCandidates--;
            }
          }
        }
      }

      return newCandidates;
    };

    var setCards = this.getPotentialSets(index);
    var runCards = this.getPotentialRuns(index);
    var ncRunCards = this.getPotentialNonContRuns(index);

    if (setCards.length > 1) {
      candidates += 2;

      // Look for unavailable cards of same numericRank
      lookingFor.concat([
        {suit: 'heart', numericRank: theCard.numericRank},
        {suit: 'diamond', numericRank: theCard.numericRank},
        {suit: 'spade', numericRank: theCard.numericRank},
        {suit: 'club', numericRank: theCard.numericRank}
      ]);
    }
    if (runCards.length > 1) {
      candidates += 2;

      // Look for unavailable cards at either end of run
      lookingFor.concat([
        {
          suit: this.cards[runCards[0]].suit,
          numericRank: this.cards[runCards[0]].numericRank - 1
        },
        {
          suit: this.cards[runCards[0]].suit,
          numericRank: this.cards[runCards[runCards.length - 1]].numericRank + 1
        }
      ]);
    }
    if (ncRunCards.length > 1) {
      candidates += 1;
      lookingFor.concat([
        {
          suit: this.cards[ncRunCards[0]].suit,
          numericRank: this.cards[ncRunCards[0]].numericRank + 1
        }
      ]);
    }
    candidates = updateCandidateBasedOnUsed(candidates, lookingFor);
    worth = candidates / 52;

    return worth;
  };

  this.chooseDiscard = function() {
    var lowestWorth = Number.MAX_VALUE;
    var leastValueableIndex = this.cards.length - 1;
    for (var cardIndex = this.cards.length - 1; cardIndex >= 0; cardIndex--) {
      var thisWorth = this.getWorth(cardIndex);

      // short circuit on first card with a worth of 0
      if (thisWorth === 0) {
        return this.cards[cardIndex];
      }

      // Otherwise see if there has been a card worth less
      if (thisWorth < lowestWorth) {
        lowestWorth = thisWorth;
        leastValueableIndex = cardIndex;
      }
    }

    return this.cards[leastValueableIndex];
  };

  this.empty = function() {
    this.cards = [];
  };

  this.show = function() {
    for (var cardIndex in this.cards) {
      this.cards[cardIndex].show();
    }
  };
}