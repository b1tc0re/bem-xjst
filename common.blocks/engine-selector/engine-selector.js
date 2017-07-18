modules.define('engine-selector', [ 'i-bem__dom'], function(provide, BEMDOM) {

    provide(BEMDOM.decl('engine-selector', {
        onSetMod: {
            js: {
                inited: function() {

                    this._bPage = this.findBlockOutside('page');
                    this._bDemo = this._bPage.findBlockInside('demo')

                    this.domElem[0].addEventListener('change', function(e){
                        this._bDemo.changeEngine(e.target.value);
                        this._bDemo.save();
                    }.bind(this));
                }
            }
        },

        setValue: function(value) {
            this.domElem.val(value).trigger('change');
        },

        getValue: function() {
            return this.domElem.val();
        }
    }, {}));

});