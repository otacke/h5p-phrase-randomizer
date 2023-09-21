import Util from '@services/util.js';
import './found-solutions-list.scss';

export default class FoundSolutionsList {

  /**
   * @class
   * @param {object} [params] Parameters.
   */
  constructor(params = {}) {
    this.params = Util.extend({}, params);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-phrase-randomizer-found-solutions');

    const title = document.createElement('div');
    title.classList.add('h5p-phrase-randomizer-found-solutions-title');
    title.innerText = this.params.dictionary.get('l10n.foundSolutionsTitle');
    this.dom.append(title);

    this.list = document.createElement('ul');
    this.list.classList.add('h5p-phrase-randomizer-found-solutions-list');
    this.dom.append(this.list);

    this.hide();

    this.reset();
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  getDOM() {
    return this.dom;
  }

  reset() {
    this.setListItems([[this.params.dictionary.get('l10n.none')]]);
  }

  /**
   * Set list items.
   * @param {(string[])[]} items Items consisting of arrays of strings.
   */
  setListItems(items) {
    while (this.list.firstChild) {
      this.list.firstChild.remove();
    }

    items.forEach((solutions) => {
      const listItem = document.createElement('li');
      listItem.classList.add('h5p-phrase-randomizer-found-solutions-list-item');
      listItem.innerText = solutions.join(' | ');
      this.list.append(listItem);
    });
  }
}
