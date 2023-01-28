/* global api */
class enes_Cambridge {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        let locale = await api.locale();
        if (locale.indexOf('CN') != -1) return 'Cambridge EN->ES Dictionary';
        if (locale.indexOf('TW') != -1) return 'Cambridge EN->ES Dictionary';
        return 'Cambridge EN->ES Dictionary';
    }

    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        let promises = [this.findCambridge(word)];
        let results = await Promise.all(promises);
        return [].concat(...results).filter(x => x);
    }

    async findCambridge(word) {
        let notes = [];
        if (!word) return notes; // return empty notes

        function T(node) {
            if (!node)
                return '';
            else
                return node.innerText.trim();
        }

        let base = 'https://dictionary.cambridge.org/search/english-spanish/direct/?q=';
        let url = base + encodeURIComponent(word);
        let doc = '';
        try {
            let data = await api.fetch(url);
            let parser = new DOMParser();
            doc = parser.parseFromString(data, 'text/html');
        } catch (err) {
            return [];
        }

        let entries = doc.querySelectorAll('.pr .entry-body__el') || [];
        for (const entry of entries) {
            let definitions = [];
            let audios = [];

            let expression = T(entry.querySelector('.headword'));
            let reading = '';
            let readings = entry.querySelectorAll('.pron .ipa');
            if (readings) {
                let reading_uk = T(readings[0]);
                let reading_us = T(readings[1]);
                reading = (reading_uk || reading_us) ? `UK [ ${reading_uk} ] — US [ ${reading_us} ]` : '';
            }
            let pos = T(entry.querySelector('.posgram'));
            pos = pos ? `<span class='pos'>${pos}</span>` : '';
            audios[0] = entry.querySelector(".uk.dloc source");
            audios[0] = audios[0] ? 'https://dictionary.cambridge.org' + audios[0].getAttribute('src') : '';
            //audios[0] = audios[0].replace('https', 'http');
            audios[1] = entry.querySelector(".us.dloc source");
            audios[1] = audios[1] ? 'https://dictionary.cambridge.org' + audios[1].getAttribute('src') : '';
            //audios[1] = audios[1].replace('https', 'http');

            let sensbodys = entry.querySelectorAll('.sense-body') || [];
            for (const sensbody of sensbodys) {
                let sensblocks = sensbody.childNodes || [];
                for (const sensblock of sensblocks) {
                    let phrasehead = '';
                    let defblocks = [];
                    if (sensblock.classList && sensblock.classList.contains('phrase-block')) {
                        phrasehead = T(sensblock.querySelector('.phrase-title'));
                        phrasehead = phrasehead ? `<div class="phrasehead">${phrasehead}</div>` : '';
                        defblocks = sensblock.querySelectorAll('.def-block') || [];
                    }
                    if (sensblock.classList && sensblock.classList.contains('def-block')) {
                        defblocks = [sensblock];
                    }
                    if (defblocks.length <= 0) continue;

                    // make definition segement
                    for (const defblock of defblocks) {
                        let indicator = T(defblock.querySelector('.def-head .indicator'));
                        let eng_tran = T(defblock.querySelector('.def-head .def'));
                        let chn_tran = T(defblock.querySelector('.def-body .trans'));
                        if (!eng_tran || !chn_tran) continue;
                        let definition = '';
                        eng_tran = `<span class='eng_tran'>${indicator} ${eng_tran}</span>`;
                        chn_tran = `<br><center><span class='chn_tran'>${chn_tran}</span></center>`;
                        let tran = `<span class='tran'>${eng_tran}${chn_tran}</span>`;
                        definition += phrasehead ? `${phrasehead}${tran}` : `${pos}${tran}` ;

                        // make exmaple segement
                        let examps = defblock.querySelectorAll('.def-body .examp') || [];
                        if (examps.length > 0 && this.maxexample > 0) {
                            definition += '<ul class="sents">';
                            for (const [index, examp] of examps.entries()) {
                                if (index > this.maxexample - 1) break; // to control only 2 example sentence.
                                let eng_examp = T(examp.querySelector('.eg'));
                                let chn_examp = T(examp.querySelector('.trans'));
                                definition += `<li class='sent'><span class='eng_sent'>${eng_examp.replace(RegExp(expression, 'gi'),`<b>${expression}</b>`)}</span></br><span class='chn_sent'>${chn_examp}</span></li>`;
                            }
                            definition += '</ul>';
                        }
                        definition && definitions.push(definition);
                    }
                }
            }
            let css = this.renderCSS();
            notes.push({
                css,
                expression,
                reading,
                definitions,
                audios
            });
        }
        return notes;
    }

    renderCSS() {
        let css =   `<style>
                div.phrasehead {margin: 2px 0; font-weight: bold;}
                span.star {color:#FFBB00;}
                span.pos {font-size:0.75em; background-color:#FFFF80; color:#FF0000; border:1px solid; border-color: ; padding:1px 4px; border-radius:5px;}
                span.tran {margin:0; padding:0;}
                span.eng_tran {margin-right:3px; padding:0; color: ;}
                span.chn_tran {font-size:1.0em; background-color:#00a000; color:white; padding:1px 5px; border-radius:5px; border: 1px solid #006400; line-height:1.6;}
                ul.sents {font-size:0.8em; list-style:inside; margin:3px 0; padding:5px; background:rgba(180,180,180,0.25); border: 1px solid #c0c0c0; border-radius:5px;}
                li.sent  {margin:0; padding:0; color: ;}
                span.eng_sent {margin-right:5px; color: ;}
                span.chn_sent {color:#008000;}
                     </style>`;
        return css;
    }
}
