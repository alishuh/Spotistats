class Quiz {
  constructor(questions) {
    this.questions = questions;
    this.score = 0;
    this.questionIndex = 0;
    }

    getCurrentQuestion() {
        return this.questions[this.questionIndex];
    }

    guess(answer) {
         //pass to question object 
    }

    nextQuestion() {
        this.questionIndex++;
    }

}

class Question { //get question from text file
    constructor(text, choices, answer) {
        this.text = text;
        this.choices = choices;
        this.answer = answer;
    }

    isCorrectAnswer(choice) {
        return this.answer === choice;
    }
}