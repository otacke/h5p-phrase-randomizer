import Util from '@services/util';
import Dictionary from '@services/dictionary';
import Jukebox from '@services/jukebox';
import charRegex from 'char-regex';
import PhraseRandomizer from '@scripts/h5p-phrase-randomizer';
import Toolbar from '@components/toolbar/toolbar';
import Randomizer from '@components/randomizer';
import he from 'he';

import AudioClick from '@audio/click.mp3';

/**
 * Mixin containing methods for initializing the content.
 */
export default class Initialization {
  /**
   * Sanitize parameters.
   */
  sanitize() {
    /*
     * this.params.behaviour.enableSolutionsButton and
     * this.params.behaviour.enableRetry are used by H5P's question type
     * contract.
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
     */

    // Sanitize parameters
    this.params = Util.extend({
      segments: [],
      solution: 'H5P',
      audio: {
        useDefaultClickPreviousNext: true
      },
      behaviour: {
        enforceHorizontalDisplay: false,
        enableRetry: true,
        enableSolutionsButton: true,
        enableCheckButton: true
      },
      l10n: {
        check: 'Check',
        submit: 'Submit',
        showSolution: 'Show solution',
        retry: 'Retry',
        lockOpen: 'Lock open!',
        lockDisabled: 'No more attempts. Lock disabled.',
        correctCombination: 'This combination opens the lock.',
        wrongCombination: 'This combination does not open the lock.',
        noMessage: '...'
      },
      a11y: {
        check: 'Check whether the combination opens the lock.',
        submit: 'Check whether the combination opens the lock and submit attempt to server.',
        showSolution: 'Show the solution. The correct symbols that will open the lock will be displayed.',
        retry: 'Retry the task. Reset all lock segments and start the task over again.',
        currentText: 'Current symbol: @text',
        currentTexts: 'Current symbols: @texts',
        previousSymbol: 'Previous symbol',
        nextSymbol: 'Next symbol',
        correctCombination: 'This combination opens the lock. @combination.',
        wrongCombination: 'Wrong combination',
        disabled: 'disabled',
        combinationLock: 'combination lock',
        segment: 'Segment @number of @total'
      }
    }, this.params);

    // Sanitize segments
    while (this.params.segments.length < Initialization.MIN_SEGMENTS) {
      this.params.segments.push({});
    }
    this.params.segments = this.params.segments
      .splice(0, Initialization.MAX_SEGMENTS)
      .map((segment) => {
        segment.options = segment.options || [];
        segment.colorBackground =
          segment.colorBackground ?? 'rgb(255, 255, 255)';

        while (segment.options.length < Initialization.MIN_OPTIONS) {
          segment.options.push(
            segment.options?.[0] ?? Initialization.PLACEHOLDER_OPTION
          );
        }

        segment.options = segment.options.map((option) => {
          option = Util.purifyHTML(option);
          return option;
        });

        return segment;
      });

    // TODO: Adjust solution handling

    // Sanitize solution
    this.params.solution = Util.stripHTML(he.decode(this.params.solution));
    let symbols = this.params.solution.match(charRegex());
    if (!symbols || symbols?.length < 1) {
      symbols = ['H', '5', 'P'];
    }
    if (symbols.length > PhraseRandomizer.SEGMENTS_MAX) {
      this.params.solution = symbols
        .slice(0, PhraseRandomizer.SEGMENTS_MAX)
        .join('');

      console.warn(`${this.getTitle()}: The original solution was truncated because it was longer than ${PhraseRandomizer.SEGMENTS_MAX} symbols that are allowed.`);
    }
  }

  /**
   * Initialize sound.
   */
  async initSound() {
    await this.setInbuiltSound();

    this.jukebox = new Jukebox();
    this.fillJukebox();

    this.randomizer.setJukebox(this.jukebox);
  }

  /**
   * Initialize.
   */
  initialize() {
    const defaultLanguage = this.extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    // Retrieve previous state
    this.previousState = this.extras?.previousState || {};
    this.viewState = this.previousState.viewState ??
      PhraseRandomizer.VIEW_STATES['task'];
    this.wasAnswerGiven = this.previousState.wasAnswerGiven ?? false;

    // Randomizer instance
    this.randomizer = new Randomizer(
      {
        dictionary: this.dictionary,
        solution: this.params.solution.match(charRegex()),
        segments: this.params.segments,
        previousState: this.previousState.lock,
        column: this.params.behaviour.column
      },
      {
        onChanged: () => {
          this.handleLockChanged();
        },
        onResized: () => {
          this.trigger('resize');
        },
        onSpinningNumberChanged: (number) => {
          this.handleSpinningNumberChanged(number);
        }
      }
    );

    // Relay H5P resize to lock component
    this.on('resize', () => {
      this.randomizer.resize();
    });
  }

  /**
   * Build main DOM.
   * @returns {HTMLElement} Main DOM.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-phrase-randomizer-main');

    const buttons = [];
    if (this.params.behaviour.enableRetry) {
      buttons.push(      {
        id: 'randomize',
        type: 'pulse',
        a11y: {
          active: this.dictionary.get('a11y.buttonRandomize'),
        },
        onClick: () => {
          this.randomizer.randomize();
        }
      });
    }

    // Toolbar
    this.toolbar = new Toolbar({
      dictionary: this.dictionary,
      ...(this.params.headline && { headline: this.params.headline }),
      buttons: buttons
    });
    dom.append(this.toolbar.getDOM());

    if (this.params.introduction) {
      const introduction = document.createElement('div');
      introduction.classList.add('h5p-phrase-randomizer-introduction');

      const content = document.createElement('div');
      content.classList.add('h5p-phrase-randomizer-intro-content');
      content.innerHTML = this.params.introduction;
      introduction.appendChild(content);

      dom.appendChild(introduction);
    }

    dom.appendChild(this.randomizer.getDOM());

    // Check answer button
    this.addButton(
      'check-answer',
      this.dictionary.get('l10n.check'),
      () => {
        this.checkAnswer();
      },
      false, // TODO: No quiz mode yet, implement it
      //true,
      { 'aria-label': this.dictionary.get('a11y.check') },
      {
        contentData: this.extras,
        textIfSubmitting: this.dictionary.get('l10n.submit')
      });

    // Show solution button
    this.addButton(
      'show-solution',
      this.dictionary.get('l10n.showSolution'),
      () => {
        this.showSolutions({ showRetry: true });
      },
      false
    );

    // Retry button
    this.addButton(
      'try-again',
      this.dictionary.get('l10n.retry'),
      () => {
        this.resetTask();
        this.randomizer.focus();
      },
      false,
      { 'aria-label': this.dictionary.get('a11y.retry') }
    );

    return dom;
  }

  /**
   * Recreate the view state from previous state.
   */
  recreateViewState() {
    if (this.viewState === PhraseRandomizer.VIEW_STATES['task']) {
      this.announceMessage({
        text: this.dictionary.get('l10n.noMessage'),
        aria: ''
      });
    }
    else if (this.viewState === PhraseRandomizer.VIEW_STATES['results']) {
      this.checkAnswer({ skipXAPI: true });
    }
    else if (this.viewState === PhraseRandomizer.VIEW_STATES['solutions']) {
      this.showSolutions({ showRetry: true });
    }
  }

  /**
   * Set inbuilt sound.
   */
  async setInbuiltSound() {
    const copyright = {
      author: 'Oliver Tacke',
      license: 'PD',
      version: 'CC0 1.0',
      year: '2023'
    };

    const mimeTypes = {
      webm: ['webm'],
      mpeg: ['mp3', 'mp4'],
      ogg: ['ogg'],
      wav: ['wav']
    };

    if (this.params.audio.useDefaultClickPreviousNext) {
      const audioClickPath = await Util.getAssetPath(
        AudioClick, this.contentId, 'H5P.PhraseRandomizer'
      );

      if (audioClickPath) {
        const fileExtension = audioClickPath.split('.').pop();
        let mime = null;
        Object.keys(mimeTypes).forEach((key) => {
          if (mime) {
            return;
          }

          if (mimeTypes[key].includes(fileExtension)) {
            mime = `audio/${key}`;
          }
        });

        this.params.audio.clickPreviousNext = [{
          path: audioClickPath,
          ...(mime && { mime: mime }),
          copyright: { ...copyright, title: 'Click' }
        }];
      }
    }
  }

  /**
   * Fill jukebox with audios.
   */
  fillJukebox() {
    const audios = {};

    for (const key in this.params.audio) {
      if (!this.params.audio[key]?.[0]?.path) {
        continue;
      }

      const src = H5P.getPath(
        this.params.audio[key][0].path, this.contentId
      );

      const crossOrigin =
        H5P.getCrossOrigin?.(this.params.audio[key][0]) ??
        'Anonymous';

      audios[key] = {
        src: src,
        crossOrigin: crossOrigin
      };
    }

    this.jukebox.fill(audios);
  }
}

// These values could be fetched from semantics.json automatically.

Initialization.MIN_SEGMENTS = 2;
Initialization.MAX_SEGMENTS = 6;

Initialization.MIN_OPTIONS = 2;
Initialization.PLACEHOLDER_OPTION = '---';
