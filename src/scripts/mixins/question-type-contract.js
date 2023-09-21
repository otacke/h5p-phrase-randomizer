import charRegex from 'char-regex';

/**
 * Mixin containing methods for H5P Question Type contract.
 */
export default class QuestionTypeContract {

  /**
   * Determine whether the task was answered already.
   * @returns {boolean} True if answer was given by user, else false.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.wasAnswerGiven;
  }

  /**
   * Get current score.
   * @returns {number} Current score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    return (this.randomizer.getResponse() === this.params.solution) ?
      1 :
      0;
  }

  /**
   * Get maximum possible score.
   * @returns {number} Maximum possible score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    return this.params.solutions.length;
  }

  /**
   * Show solutions.
   * @param {object} params Parameters.
   * @param {boolean} params.showRetry If true and valid, show retry button.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions(params = {}) {
    const ariaText = this.dictionary
      .get('a11y.correctCombination')
      .replace(
        /@combination/g, this.params.solution.match(charRegex()).join(', ')
      );

    this.randomizer.disable();
    this.randomizer.showSolutions();

    this.announceMessage({
      text: this.dictionary.get('l10n.correctCombination'),
      aria: ariaText
    });

    // Announce message before some other element gets focus
    window.setTimeout(() => {
      this.setViewState('solutions');
      this.hideButton('check-answer');
      this.hideButton('show-solution');
      this.hideButton('try-again');

      if (params.showRetry) {
        if (this.params.behaviour.enableRetry) {
          this.showButton('try-again');
        }
        else {
          window.setTimeout(() => {
            this.randomizer.focus(); // No button to focus, focus lock instead
          }, 50);
        }
      }
    }, 50);
  }

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    this.setViewState('task');
    this.wasAnswerGiven = false;

    this.announceMessage({
      text: this.dictionary.get('l10n.noMessage'),
      aria: ''
    });

    this.hideButton('show-solution');
    this.hideButton('try-again');

    this.showButton('check-answer');

    this.randomizer.reset();
  }

  /**
   * Get xAPI data.
   * @returns {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    const xAPIEvent = this.createXAPIEvent('answered');
    return {
      statement: xAPIEvent.data.statement
    };
  }
}
