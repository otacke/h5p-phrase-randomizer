import Util from '@services/util';
import QuestionTypeContract from '@mixins/question-type-contract';
import Initialization from '@mixins/initialization';
import XAPI from '@mixins/xapi';
import '@styles/h5p-phrase-randomizer.scss';

export default class PhraseRandomizer extends H5P.Question {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('phrase-randomizer');

    Util.addMixins(
      PhraseRandomizer, [QuestionTypeContract, Initialization, XAPI]
    );

    /*
     * this.params.behaviour.enableSolutionsButton and
     * this.params.behaviour.enableRetry are used by H5P's question type
     * contract.
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
     */

    this.params = params;
    this.contentId = contentId;
    this.extras = extras;

    // Inititialization mixin
    this.sanitize();
    this.initialize();
    this.dom = this.buildDOM();
    this.recreateViewState();
  }

  /**
   * Register the DOM elements with H5P.Question.
   */
  registerDomElements() {
    // Register content
    this.setContent(this.dom);

    // Retrieve root h5p container - unfortunately not accessible via H5P core
    Util.callOnceVisible(this.dom, () => {
      this.h5pContainer = this.dom.closest('.h5p-content .h5p-container');

      this.on('resize', () => {
        this.resize();
      });

      this.resize();
    });
  }

  /**
   * Resize content.
   */
  resize() {
    if (!this.h5pContainer) {
      return;
    }

    this.horizontalMargin = this.horizontalMargin ?? (
      this.h5pContainer.getBoundingClientRect().width -
      this.dom.getBoundingClientRect().width
    );

    this.randomizer.resize(
      this.h5pContainer.getBoundingClientRect().width - this.horizontalMargin
    );
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      wasAnswerGiven: this.wasAnswerGiven,
      viewState: this.viewState,
      message: this.randomizer.getMessage(),
      randomizer: this.randomizer.getCurrentState()
    };
  }

  /**
   * Check answer.
   * @param {object} [params] Parameters.
   * @param {boolean} params.skipXAPI If true, don't trigger xAPI events.
   */
  checkAnswer(params = {}) {
    this.handleAnswerGiven();

    if (this.randomizer.getResponse() === this.params.solution) {
      this.handleCorrectResponse(params);
      return;
    }

    this.randomizer.showAnimationWrongCombination();

    this.handleFinalWrongResponse(params);
  }

  /**
   * Handle correct response.
   * @param {object} [params] Parameters.
   * @param {boolean} params.skipXAPI If true, don't trigger xAPI events.
   */
  handleCorrectResponse(params = {}) {
    this.randomizer.disable();
    this.setViewState('results');

    this.announceMessage({ text: this.dictionary.get('l10n.lockOpen') });

    if (!params.skipXAPI) {
      this.triggerXAPIEvent('answered');
    }

    window.setTimeout(() => {
      this.hideButton('check-answer');

      if (this.params.behaviour.enableRetry) {
        this.showButton('try-again');
        setTimeout(() => {
          this.focusButton('try-again'); // Not done by H5P.Question
        }, 50);
      }
      else if (!params.skipXAPI) {
        this.randomizer.focus(); // No button to focus, focus lock instead
      }
    }, 50);
  }

  /**
   * Handle intermediary wrong response.
   */
  handleIntermediaryWrongResponse() {
    this.announceMessage({
      text: this.dictionary.get('l10n.wrongCombination')
    });
  }

  /**
   * Handle final wrong response.
   * @param {object} [params] Parameters.
   * @param {boolean} params.skipXAPI If true, don't trigger xAPI events.
   */
  handleFinalWrongResponse(params = {}) {
    this.setViewState('results');
    this.randomizer.disable();

    if (!params.skipXAPI) {
      this.triggerXAPIEvent('answered');
    }

    this.announceMessage({ text: this.dictionary.get('l10n.lockDisabled') });

    // Lock disabled message should be read before other element gets focus
    window.setTimeout(() => {
      this.hideButton('check-answer');

      if (this.params.behaviour.enableSolutionsButton) {
        this.showButton('show-solution');
      }

      if (this.params.behaviour.enableRetry) {
        this.showButton('try-again');
      }

      if (
        !this.params.behaviour.enableSolutionsButton &&
        !this.params.behaviour.enableRetry
      ) {
        if (!params.skipXAPI) {
          window.setTimeout(() => {
            this.randomizer.focus(); // No button to focus, focus lock instead
          }, 50);
        }
      }
    }, 50);
  }

  /**
   * Announce message as text and audio.
   * @param {object} params Parameters.
   * @param {string} params.text Text.
   */
  announceMessage(params = {}) {
    if (!params.text) {
      return;
    }

    this.randomizer.setMessage(params.text);
    this.read(params.aria ?? params.text); // H5P.Question function
  }

  /**
   * Set view state.
   * @param {string|number} state State to be set.
   */
  setViewState(state) {
    if (
      typeof state === 'string' &&
      PhraseRandomizer.VIEW_STATES[state] !== undefined
    ) {
      this.viewState = PhraseRandomizer.VIEW_STATES[state];
    }
    else if (
      typeof state === 'number' &&
      Object.values(PhraseRandomizer.VIEW_STATES).includes(state)
    ) {
      this.viewState = state;

      this.content.setViewState(
        PhraseRandomizer.VIEW_STATES.find((value) => value === state).keys[0]
      );
    }
  }

  /**
   * Handle lock disabled.
   */
  handleLockChanged() {
    this.handleAnswerGiven();
  }

  /**
   * Handle lock was checked.
   */
  handleAnswerGiven() {
    this.wasAnswerGiven = true;
  }

  /**
   * Handle spinning number changed.
   * @param {number} number Number of spinning segments.
   */
  handleSpinningNumberChanged(number) {
    if (typeof number !== 'number' || number < 0) {
      return;
    }

    if (number === 0) {
      this.toolbar.enableButton('randomize');
    }
    else {
      this.toolbar.disableButton('randomize');
    }
  }
}

/** @constant {object} VIEW_STATES view states */
PhraseRandomizer.VIEW_STATES = { task: 0, results: 1, solutions: 2 };

/** @constant {number} SEGMENTS_MAX Maximum number of segments */
PhraseRandomizer.SEGMENTS_MAX = 6;
