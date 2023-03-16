const topTracks = {
    short_term: [],
    medium_term: [],
    long_term: []
};

const topArtists = {
    short_term: [],
    medium_term: [],
    long_term: []
};

// Get the top tracks and artists from the Spotify API
async function loadTopItems() {
    topTracks.short_term = (await getTopItems('tracks', 20, 'short_term'));
    topTracks.medium_term = (await getTopItems('tracks', 20, 'medium_term'));
    topTracks.long_term = (await getTopItems('tracks', 20, 'long_term'));

    topArtists.short_term = (await getTopItems('artists', 20, 'short_term'));
    topArtists.medium_term = (await getTopItems('artists', 20, 'medium_term'));
    topArtists.long_term = (await getTopItems('artists', 20, 'long_term'));
}


/* The Quiz class generates a quiz with 10 random questions from the questions.json file
and displays them to the user. It also keeps track of the user's score. */
class Quiz {
    constructor() {
        this.questions = [];
        this.score = 0;
        this.currentQuestionIndex = 0;
    }

    async generateQuestions() { //generates 10 random questions from the questions.json file
        const response = await fetch('/questions.json');
        const allQuestions = await response.json();
        let questions = [];
        let randomQuestionIndex = 0;
        while (questions.length < 10) { 
            randomQuestionIndex = Math.floor(Math.random() * allQuestions.length); 
            questions.push(new Question(allQuestions[randomQuestionIndex]));
            allQuestions.splice(randomQuestionIndex, 1);
        }
        this.questions = questions;
        console.log(this.questions);
    }
    
    start() { //starts the quiz
        document.getElementById('quizInfo').style.display = 'none';
        this.displayQuestion();

        document.getElementById("nextQuestionButton").addEventListener("click", () => {
            this.nextQuestion();
        });
    }

    displayQuestion() { //displays the current question and its choices
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const choices = currentQuestion.choices;

        const questionHeading = document.getElementById('question');
        const choicesSection = document.getElementById('choicesSection');

        choicesSection.innerHTML = ''; //clears the choices section
        questionHeading.innerHTML = currentQuestion.question; //current question

        for (let i = 0; i < 4; i++) { //displays the choices for the current question in a random order 
            let randomChoiceIndex = Math.floor(Math.random() * choices.length); 
            let choice = choices[randomChoiceIndex];
            let button = document.createElement("button");
            button.className = "choice";
            button.id = choice;
            button.innerText = choice;
            button.addEventListener("click", (event) => this.checkAnswer(event.target.id)); //allows the user to select a choice by clicking on it
            choicesSection.appendChild(button);
            choices.splice(randomChoiceIndex, 1); //removes the current choice so it can't be displayed again
        }
    }

    checkAnswer(choice) { //checks if the user's choice is correct, and displays the correct answer if it is incorrect

        if (this.questions[this.currentQuestionIndex].isCorrectAnswer(choice)) {
            this.score++;
            document.getElementById('questionAnswered').style.display = 'block';
            document.getElementById('answerFeedback').innerHTML = 'Correct!';
        }
        else {
            document.getElementById('questionAnswered').style.display = 'block';
            document.getElementById('answerFeedback').innerHTML = 'Incorrect! The correct answer is ' + this.questions[this.currentQuestionIndex].answer + '!';
        }
    }

    nextQuestion() { //displays the next question
        document.getElementById('questionAnswered').style.display = 'none';
        console.log(this.currentQuestionIndex);
        if (this.currentQuestionIndex < this.questions.length - 1) { 
            this.currentQuestionIndex++;
            this.displayQuestion();
        }
        else {
            this.displayScore();
        }
    }

    displayScore() { //displays the user's score
        document.getElementById('quiz').style.display = 'none';
        document.getElementById('quizResults').style.display = 'block';
        document.getElementById('quizScore').innerHTML = `You got ${this.score} out of ${this.questions.length} questions correct!`;
    }
}



/* The Question class represents a question in the quiz. It has a question, 4 choices, and an answer.
Questions are generated from the questions.json file and are personalised to the user's top tracks and artists. */
class Question { 
    constructor(questionObject) {
        this.question = questionObject.question;
        this.choices = [];
        this.answer = '';

        this.type = questionObject.type;
        this.timePeriod = questionObject.timePeriod;
        this.answerIndex = questionObject.answerIndex;
        this.generateChoices(); 
    }

    setAnswer() { 
        if (isNaN(this.answerIndex)) {
            this.answerIndex = Math.floor(Math.random() * 15);
        }
        if (this.type === 'tracks') {
            this.answer = topTracks[this.timePeriod][this.answerIndex].name;
        }
        else if (this.type === 'artists') {
            this.answer = topArtists[this.timePeriod][this.answerIndex].name;
        }
    }

    setChoices() {
        for (let i = this.answerIndex; i < this.answerIndex + 4; i++) { 
            if (this.type === 'tracks') {
                this.choices.push(topTracks[this.timePeriod][i].name);
            }
            else if (this.type === 'artists') {
                this.choices.push(topArtists[this.timePeriod][i].name);
            }
        }
    }

    generateChoices() { 
        this.setAnswer();
        this.setChoices();
    }

    isCorrectAnswer(choice) {
        return this.answer === choice;
    }
}




async function startQuiz () {
    await loadTopItems();
    let quiz = new Quiz();
    await quiz.generateQuestions();
    quiz.start();
}

function restartQuiz() {
    document.getElementById('quizResults').style.display = 'none';
    document.getElementById('quiz').style.display = 'block';
    startQuiz();
}

