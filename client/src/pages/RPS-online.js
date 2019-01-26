import React, { Component } from "react";
import IdleTimer from 'react-idle-timer';
import "./style.css";
import { MDBContainer, MDBRow, MDBCol, Animation, MDBBtn, Card, CardBody, CardTitle } from 'mdbreact';
import firebase from "../firebase";
import API from "../utils/API";
import Header from "../components/Header";
import Img from "../components/Img";

const database = firebase.database();
const chatData = database.ref("/chatRPS");
const playersRef = database.ref("playersRPS");
const currentTurnRef = database.ref("turnRPS");
const win = database.ref("winRPS");
const rock = "./images/rock.jpg"
const paper = "./images/paper.jpg"
const scissors = "./images/scissors.jpg"
let playerRef = "";
let currentPlayers = null;
let username = "";
let playerNum = null;
let playerOneExists = false;
let playerTwoExists = false;
let playerOneData = null;
let playerTwoData = null;

const capitalize = (name) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

const styles = {
    background: {
        background: "#e4f0d0"
    },
}

class RPSonline extends Component {
    constructor(props) {
        super(props)
        this.idleTimer = null
        this.onIdle = this._onIdle.bind(this)
    }

    _onIdle(e) {
        window.location.href = "/"
    }

    state = {
        username: "",
        chat: [],
        currentTurn: null,
        winner: null,
        loggedIn: false,

        playerOne: {
            name: "Waiting for Player 1",
            wins: 0,
            losses: 0,
            choice: ""
        },

        playerTwo: {
            name: "Waiting for Player 2",
            wins: 0,
            losses: 0,
            choice: ""
        }


    }

    playersView = () => {
        if (playerNum === 1) {
            this.player1.scrollIntoView();
        } else if (playerNum === 2) {
            this.player2.scrollIntoView();
        }

    }

    playerCheck = () => {

        const playersRPSLSRef = database.ref("playersRPSLS");

        let RPSLSname
        let RPSLSname2

        playersRPSLSRef.on("value", (snapshot) => {
            RPSLSname = snapshot.child("1").child("name").val();
            RPSLSname2 = snapshot.child("2").child("name").val();
            if (username === RPSLSname) {

                window.location.reload()

            } else if (username === RPSLSname2) {

                window.location.reload()

            }
        })
    }

    gameCheck = () => {
        let RPSname
        let RPSname2

        if (playerOneExists) {
            playersRef.on("value", (snapshot) => {
                RPSname = snapshot.child("1").child("name").val();
                RPSname2 = snapshot.child("2").child("name").val();

                if (RPSname === RPSname2) {

                    alert("Cannot play against yourself")

                    window.location.reload()
                }
            })
        }
    }

    chatDisplay = () => {
        chatData.orderByChild("time").on("child_added", (snapshot) => {

            // If idNum is 0, then its a disconnect message and displays accordingly
            // If not - its a user chat message
            this.setState({
                chat: [...this.state.chat, {
                    name: snapshot.val().name,
                    message: snapshot.val().message,
                    idNum: snapshot.val().idNum,
                    keyId: this.state.chat.length
                }]
            });
            this.chat.scrollTop = this.chat.scrollHeight;
        });

    }


    componentDidMount() {

        if (this.state.loggedIn === true) {
            this.playerCheck()
        }

        API.signedIn()
            .then(response => {
                console.log(response);
                if (response.data.loggedIn) {
                    this.setState({ loggedIn: true, username: response.data.username });
                } else {
                    console.log("No logged in user stored in session");
                }
            });

        this.chatDisplay();

        win.set(null)

        playersRef.on("value", (snapshot) => {

            // length of the 'players' array
            currentPlayers = snapshot.numChildren();

            // Check to see if players exist
            playerOneExists = snapshot.child("1").exists();
            playerTwoExists = snapshot.child("2").exists();

            // Player data objects
            playerOneData = snapshot.child("1").val();
            playerTwoData = snapshot.child("2").val();

            console.log(playerOneData)
            // If theres a player 1, fill in name and win loss data
            if (playerOneExists) {
                this.setState({
                    playerOne: {
                        name: playerOneData.name,
                        wins: playerOneData.wins,
                        losses: playerOneData.losses,
                        choice: playerOneData.choice
                    }
                });
            }
            else {

                // If there is no player 1, clear win/loss data and show waiting
                this.setState({
                    playerOne: {
                        name: "Waiting for Player 1",
                        wins: 0,
                        losses: 0
                    }
                });
            }

            // If theres a player 2, fill in name and win/loss data
            if (playerTwoExists) {
                this.setState({
                    playerTwo: {
                        name: playerTwoData.name,
                        wins: playerTwoData.wins,
                        losses: playerTwoData.losses,
                        choice: playerTwoData.choice
                    }
                });
            }
            else {

                // If no player 2, clear win/loss and show waiting
                this.setState({
                    playerTwo: {
                        name: "Waiting for Player 2",
                        wins: 0,
                        losses: 0
                    }
                });
            }
        });

        playersRef.on("child_added", function (snapshot) {

            if (currentPlayers === 1) {

                // set turn to 1, which starts the game
                currentTurnRef.set(1);
            }
        });

        currentTurnRef.on("value", (snapshot) => {

            // Gets current turn from snapshot
            this.setState({ currentTurn: snapshot.val() });


            // Don't do the following unless you're logged in
            if (playerNum) {

                if (this.state.currentTurn === 3) {

                    // Where the game win logic takes place then resets to turn 1
                    this.gameLogic(playerOneData.choice, playerTwoData.choice);

                    //  reset after timeout
                    const moveOn = () => {

                        win.set(null)

                        win.on("value", snapshot => {

                            this.setState({ winner: snapshot.val() });
                        });
                        // check to make sure players didn't leave before timeout
                        if (playerOneExists && playerTwoExists) {
                            currentTurnRef.set(1);
                        }

                    };

                    //  show results for 3 seconds, then resets
                    setTimeout(moveOn, 1000 * 3);
                }

            }
        });
        this.winner();
    }

    winner = () => {
        win.on("value", snapshot => {

            this.setState({ winner: snapshot.val() });
        });

    }

    componentDidUpdate() {
        this.chat.scrollTop = this.chat.scrollHeight;
    }

    getInGame = () => {

        // For adding disconnects to the chat with a unique id (the date/time the user entered the game)
        // Needed because Firebase's '.push()' creates its unique keys client side,
        // so you can't ".push()" in a ".onDisconnect"
        let chatDataDisc = database.ref("/chatRPS/" + Date.now());

        // Checks for current players, if theres a player one connected, then the user becomes player 2.
        // If there is no player one, then the user becomes player 1
        if (currentPlayers < 2) {

            if (playerOneExists) {
                playerNum = 2;
            }
            else {
                playerNum = 1;
            }

            // Creates key based on assigned player number
            playerRef = database.ref("/playersRPS/" + playerNum);

            // Creates player object. 'choice' is unnecessary here, but I left it in to be as complete as possible

            if (this.state.loggedIn === true) {
                API.getUser(username)
                    .then(res => {
                        playerRef.set({
                            name: username,
                            wins: res.data.wins,
                            losses: res.data.losses,
                            choice: null
                        });
                    })
            } else {
                playerRef.set({
                    name: username,
                    wins: 0,
                    losses: 0,
                    choice: null
                });
            }

            // On disconnect remove this user's player object
            playerRef.onDisconnect().remove();


            // If a user disconnects, set the current turn to 'null' so the game does not continue
            currentTurnRef.onDisconnect().remove();

            // Send disconnect message to chat with Firebase server generated timestamp and id of '0' to denote system message
            chatDataDisc.onDisconnect().set({
                name: username,
                time: firebase.database.ServerValue.TIMESTAMP,
                message: "has disconnected.",
                idNum: 0
            });


        }
        else {
            playerNum = null
            // If current players is "2", will not allow the player to join
            alert("Sorry, Game Full! Try Again Later!");
        }
    }

    playerOneWon = () => {


        win.set(playerOneData.name)

        playersRef.child("1").child("wins").set(playerOneData.wins + 1);
        playersRef.child("2").child("losses").set(playerTwoData.losses + 1);


            API.updateUser(
                playerOneData.name,
                {
                    win:"win"
                })
                .then(console.log("success"))

            API.updateUser(
                playerTwoData.name,
                {
                    win:"lose"
                })
                .then(console.log("success"))
        
    };

    playerTwoWon = () => {

        win.set(playerTwoData.name)

        playersRef.child("2").child("wins").set(playerTwoData.wins + 1);
        playersRef.child("1").child("losses").set(playerOneData.losses + 1);

       

            API.updateUser(
                this.state.playerOne.name,
                {
                    win:"lose"
                })
                .then(console.log("success"))

            API.updateUser(
                this.state.playerTwo.name,
                {
                    win:"win"
                })
                .then(console.log("success"))
        

    };

    tie = () => {
        win.set("Tie")
    };

    gameLogic = (player1choice, player2choice) => {


        if (player1choice === "Rock" && player2choice === "Rock") {
            this.tie();
        }
        else if (player1choice === "Paper" && player2choice === "Paper") {
            this.tie();
        }
        else if (player1choice === "Scissors" && player2choice === "Scissors") {
            this.tie();
        }
        else if (player1choice === "Rock" && player2choice === "Paper") {
            this.playerTwoWon();
        }
        else if (player1choice === "Rock" && player2choice === "Scissors") {
            this.playerOneWon();
        }
        else if (player1choice === "Paper" && player2choice === "Rock") {
            this.playerOneWon();
        }
        else if (player1choice === "Paper" && player2choice === "Scissors") {
            this.playerTwoWon();
        }
        else if (player1choice === "Scissors" && player2choice === "Rock") {
            this.playerTwoWon();
        }
        else if (player1choice === "Scissors" && player2choice === "Paper") {
            this.playerOneWon();
        }
    }


    handleInputChange = event => {
        // Getting the value and name of the input which triggered the change
        const { name, value } = event.target;

        // Updating the input's state
        this.setState({
            [name]: value
        });
    };

    nameSubmit = event => {
        // Preventing the default behavior of the form submit (which is to refresh the page)
        event.preventDefault();

        if (this.username.value === "" && this.state.username === "") {
            alert("Please Enter Name");
        }
        else if (this.state.username !== "" && this.username.value === "") {
            username = this.state.username

            this.gameCheck()

            this.getInGame();
        }
        else if (this.username.value !== "") {

            let chosenName = capitalize(this.username.value)

            username = chosenName

            this.setState({ username: chosenName });

            this.getInGame();
        }

        this.playersView();
    };

    messageSubmit = event => {
        event.preventDefault();

        if (this.message.value !== "") {
            let message = this.message.value


            if (this.state.username === "") {
                chatData.push({
                    name: "Guest",
                    message: message,
                    time: firebase.database.ServerValue.TIMESTAMP,
                    idNum: playerNum,
                });
            } else {
                chatData.push({
                    name: this.state.username,
                    message: message,
                    time: firebase.database.ServerValue.TIMESTAMP,
                    idNum: playerNum,
                });
            }
        }
        this.message.value = ""
    }

    playerChoice(choice) {

        playerRef.child("choice").set(choice);

        currentTurnRef.transaction((turn) => {
            return turn + 1;

        });

    }

    render() {

        const whoWon = (winner) => {
            if (winner === "Tie") {
                return (
                    <Animation type="fadeIn">
                        <Img
                            alt="No Winner"
                            width="17rem"
                            height="17rem"
                            src="http://www.vestaretailerawards.com/wp-content/uploads/2016/10/no-winner.jpg"
                        />
                    </Animation>
                )
            } else if (winner !== null) {
                return (
                    <div>
                        <Img
                            alt="You Won"
                            width="15rem"
                            height="15rem"
                            src="https://thumbs.gfycat.com/DescriptiveMassiveFugu-max-1mb.gif"
                        />
                        <h1>
                            {winner}
                        </h1>
                    </div>
                )
            } else {
                return (
                    <Img
                        alt="RPS Online"
                        width="21rem"
                        height="19rem"
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Rock-paper-scissors.svg/300px-Rock-paper-scissors.svg.png"
                    />
                )
            }
        }

        const choiceImg = (choice) => {
            if (choice === "Rock") {
                return <Img width="10rem" height="10rem" src={rock} alt="rock" />
            } else if (choice === "Paper") {
                return <Img width="10rem" height="10rem" src={paper} alt="paper" />
            } else if (choice === "Scissors") {
                return <Img width="10rem" height="10rem" src={scissors} alt="scissors" />
            }
        }

        return (
            <MDBContainer fluid style={styles.background} onClick={this.clearRefresh}>
                <IdleTimer
                    ref={ref => { this.idleTimer = ref }}
                    element={document}
                    onIdle={this.onIdle}
                    debounce={250}
                    timeout={1000 * 60} />
                <Header>
                    Rock Paper Scissors Online
                </Header>
                <MDBContainer>
                    <MDBRow>
                        <MDBCol className="d-flex justify-content-center">
                            {playerNum === null ? (
                                <form onSubmit={this.nameSubmit}>

                                    <input className={this.state.loggedIn === true ? "invisible" : "visible text-center"}
                                        id="username"
                                        name="username"
                                        ref={(input) => { this.username = input }}
                                        type="input"
                                        placeholder="Enter Name"
                                    />
                                    <div className="text-center">
                                        <MDBBtn color="unique" type="submit">Start</MDBBtn>
                                    </div>

                                </form>
                            ) : (<h2 className="text-center">Hi {this.state.username}! You are Player {playerNum}</h2>)
                            }
                        </MDBCol>
                    </MDBRow>
                    <br />
                    <MDBRow>
                        <MDBCol xl="4" className="d-flex justify-content-center my-1" >
                            <div ref={player1 => this.player1 = player1} />
                            <Card style={{ width: "21rem", height: "19rem" }} border={this.state.currentTurn === 1 ? "success" : null}>
                                <CardBody>
                                    <CardTitle className="text-center mb-1">{this.state.playerOne.name}</CardTitle>
                                    <div className="text-center d-flex justify-content-center">
                                        {this.state.currentTurn === 1 && playerNum === 1 ?
                                            (<ul>
                                                <li onClick={() => this.playerChoice("Rock")}><Img width="4rem" height="4rem" src={rock} alt="rock" /></li>

                                                <li className="py-2" onClick={() => this.playerChoice("Paper")}><Img width="4rem" height="4rem" src={paper} alt="paper" /></li>

                                                <li onClick={() => this.playerChoice("Scissors")}><Img width="4rem" height="4rem" src={scissors} alt="scissors" /></li>
                                            </ul>) : null}

                                        {this.state.currentTurn === 2 && playerNum === 1 ?
                                            (<div>
                                                <h2>Opponent's Turn</h2>
                                                <Img width="10rem" height="10rem" src="https://i.redd.it/ounq1mw5kdxy.gif" alt="loading" />
                                            </div>) : null}

                                        {this.state.currentTurn === 3 ? choiceImg(this.state.playerOne.choice) : null}

                                        <div className="outcomes">
                                            <div className="outcome-trackers" id="player1-wins">Wins: {this.state.playerOne.wins} </div>
                                            <div className="outcome-trackers" id="player1-losses"> Losses: {this.state.playerOne.losses}</div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </MDBCol>
                        <MDBCol xl="4" className="d-flex justify-content-center my-1">
                            <div ref={player2 => this.player2 = player2} />
                            <Card className="text-center" style={{ width: "21rem", height: "19rem" }}>
                                {whoWon(this.state.winner)}
                            </Card>
                        </MDBCol>
                        <MDBCol xl="4" className="d-flex justify-content-center my-1" >
                            <Card style={{ width: "21rem", height: "19rem" }} border={this.state.currentTurn === 2 ? "success" : null}>
                                <CardBody>
                                    <CardTitle className="text-center mb-1">{this.state.playerTwo.name}</CardTitle>
                                    <div className="text-center">
                                        {this.state.currentTurn === 1 && playerNum === 2 ?
                                            (<div>
                                                <h2>Opponent's Turn</h2>
                                                <Img width="10rem" height="10rem" src="https://i.redd.it/ounq1mw5kdxy.gif" alt="loading" />
                                            </div>) : null}

                                        {this.state.currentTurn === 2 && playerNum === 2 ?
                                            (<ul>
                                                <li onClick={() => this.playerChoice("Rock")}><Img width="4rem" height="4rem" src={rock} alt="rock" /></li>

                                                <li className="py-2" onClick={() => this.playerChoice("Paper")}><Img width="4rem" height="4rem" src={paper} alt="paper" /></li>

                                                <li onClick={() => this.playerChoice("Scissors")}><Img width="4rem" height="4rem" src={scissors} alt="scissors" /></li>
                                            </ul>) : null}

                                        {this.state.currentTurn === 3 ? choiceImg(this.state.playerTwo.choice) : null}

                                        <div className="outcomes">
                                            <div className="outcome-trackers" id="player2-wins">Wins: {this.state.playerTwo.wins}</div>
                                            <div className="outcome-trackers" id="player2-losses">Losses: {this.state.playerTwo.losses}</div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </MDBCol>
                    </MDBRow>
                    <div id="chat" className="justify-content-center my-1">
                        <div>
                            <div id="chat-messages" ref={chat => this.chat = chat}>
                                {this.state.chat.map(line => (
                                    <p className={'line-chat player' + line.idNum} key={line.keyId}><span>{line.name}</span>: {line.message}</p>
                                ))}
                            </div>
                            <div id="chat-bar">
                                <form onSubmit={this.messageSubmit}>
                                    <input id="chat-input"
                                        name="message"
                                        ref={(input) => { this.message = input }}
                                        type="input" />
                                    <button id="chat-send" type="submit">Send</button>
                                </form >
                            </div>
                        </div>
                    </div>
                </MDBContainer>
            </MDBContainer>
        );
    }

}

export default RPSonline;