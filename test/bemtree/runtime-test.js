var assert = require('assert');
var fixtures = require('../fixtures')('bemtree');
var bemxjst = require('../../').bemtree;

var test = fixtures.test;

describe('BEMTREE compiler/Runtime', function() {
  describe('applyNext()', function() {
    it('should support applyNext()', function() {
      test(function() {
        block('b1').content()(function() {
          return '%' + applyNext() + '%';
        });
        block('b1').content()(function() {
          return '{' + applyNext() + '}';
        });
      },
      { block: 'b1', content: 'ohai' },
      { block: 'b1', content: '{%ohai%}' });
    });

    it('should support applyNext({ ... }) with changes', function() {
      test(function() {
        block('b1').content()(function() {
          return '%' + this.wtf + applyNext() + '%';
        });
        block('b1').content()(function() {
          return '{' + applyNext({ wtf: 'no ' }) + '}';
        });
      },
      { block: 'b1', content: 'ohai' },
      { block: 'b1', content: '{%no ohai%}' });
    });

    it('should support local', function() {
      test(function() {
        block('b1').content()(function() {
          return local({ tmp: 'b2' })(function() {
            return this.tmp;
          });
        });
      }, { block: 'b1' }, { block: 'b1', content: 'b2' });
    });

    it('should support visiting higher priority templates', function() {
      test(function() {
        block('b1').content()(function() {
          return applyNext({ wtf: true });
        });

        block('b1').match(function() {
          return this.wtf;
        }).content()('ok');
      }, { block: 'b1' }, { block: 'b1', content: 'ok' });
    });

    it('should support > 31 templates (because of the bit mask)', function() {
      test(function() {
        block('b1').content()(function() {
          return 'ok';
        });
        for (var i = 0; i < 128; i++) {
          block('b1').content()(function() {
            return applyNext();
          });
        }
      }, { block: 'b1' }, { block: 'b1', content: 'ok' });
    });

    it('should support recursive applyNext() over block boundary for content',
     function() {
      test(function() {
        block('b1').def()(function() {
          this.ctx.blah = 'ololo';
          return applyNext();
        });
      }, {
        block: 'b1',
        content: {
          block: 'b1',
          content: {
            block: 'b1',
            content: 'ok'
          }
        }
      }, {
        block: 'b1',
        blah: 'ololo',
        content: {
          block: 'b1',
          blah: 'ololo',
          content: {
            block: 'b1',
            blah: 'ololo',
            content: 'ok'
          }
        }
      });
    });
  });

  describe('applyCtx()', function() {
    it('should work with just context', function() {
      test(function() {
        block('b1').content()(function() {
          return applyCtx([
            { block: 'b2', content: 'omg' },
            { block: 'b3', tag: 'br' }
          ]);
        });
      }, {
        block: 'b1'
      }, {
        block: 'b1',
        content: [
          { block: 'b2', content: 'omg' },
          { block: 'b3', tag: 'br' }
        ]
      });
    });

    it('should work with both context and changes', function() {
      test(function() {
        block('b2').content()(function() {
          return this.wtf;
        });

        block('b1').content()(function() {
          return applyCtx([
            { block: 'b2' }
          ], { wtf: 'ohai' });
        });
      }, {
        block: 'b1'
      }, {
        block: 'b1',
        content: [
          { block: 'b2', content: 'ohai' }
        ]
      });
    });
  });

  describe('custom modes', function() {
    it('should support custom modes', function () {
      test(function() {
        block('b1').mode('custom')('ok');
        block('b1').content()(function() {
          return apply('custom');
        });
      }, {
        block: 'b1'
      }, {
        block: 'b1',
        content: 'ok'
      })
    });

    it('should support custom modes with changes', function () {
      test(function() {
        block('b1').mode('custom')(function() {
          return this.yikes;
        });
        block('b1').content()(function() {
          return apply('custom', { yikes: 'ok' });
        });
      }, {
        block: 'b1'
      }, {
        block: 'b1',
        content: 'ok'
      })
    });

  });

  it('should render different types as is', function() {
    test(function() {}, [
      'string',
      1,
      {},
      [],
      {
        block: 'b1',
        field: 'some value',
        content: {
          elem: 'e1',
          content: {
            tag: 'span',
            content: 'blah'
          }
        }
      }
    ], [
      'string',
      1,
      {},
      [],
      {
        block: 'b1',
        field: 'some value',
        content: {
          elem: 'e1',
          content: {
            tag: 'span',
            content: 'blah'
          }
        }
      }
    ]);
  });

  it('should properly save context while render plain html items', function() {
    test(function() {
    }, {
      block: 'aaa',
      content: [
        {
          elem: 'xxx1',
          content: {
            block: 'bbb',
            elem: 'yyy1',
            content: { tag: 'h1', content: 'h 1' }
          }
        },
        {
          elem: 'xxx2'
        }
      ]
    }, {
      block: 'aaa',
      content: [
        {
          elem: 'xxx1',
          content: {
            block: 'bbb',
            elem: 'yyy1',
            content: { tag: 'h1', content: 'h 1' }
          }
        },
        {
          elem: 'xxx2'
        }
      ]
    });
  });

  it('should not match extra predicates', function() {
    test(function() {
      block('b1').content()(function() {
        return { elem: 'e1' };
      });

      block('b1').elem('e1').mod('a', 'b').content()('with mod');
    }, { block: 'b1' }, {
      block: 'b1',
      content: { elem: 'e1' }
    });
  });

  // TODO: fixme
  // it('should support this.reapply()', function() {
  //   test(function() {
  //     block('b1').content()(function() {
  //       this.wtf = 'fail';
  //       return this.reapply({ block: 'b2' });
  //     });

  //     block('b2').content()(function() {
  //       return this.wtf || 'ok';
  //     });
  //   }, { block: 'b1' }, {
  //     block: 'b1',
  //     content: {
  //       block: 'b2',
  //       content: 'ok'
  //     }
  //   });
  // });

  describe('mods', function() {
    it('should lazily define mods', function() {
      test(function() {
        block('b1').content()(function() {
          return this.mods.a || 'yes';
        });
      }, { block: 'b1' }, { block: 'b1', content: 'yes' });
    });

    it('should take mods from BEMJSON', function() {
      test(function() {
        block('b1').content()(function() {
          return this.mods.a || 'no';
        });
      }, {
        block: 'b1',
        mods: {
          a: 'yes'
        }
      }, { block: 'b1', mods: { a: 'yes' }, content: 'yes' });
    });

    it('should support changing mods in runtime', function() {
      test(function() {
        block('b1').def()(function() {
          this.mods.a = 'b';
          return applyNext();
        });

        block('b1').mod('a', 'b').content()('ok');
      }, { block: 'b1' }, { block: 'b1', content: 'ok' });
    });

    it('should inherit mods properly', function() {
      test(function() {
        block('b1').content()(function() {
          return { elem: 'e1' };
        });
      }, {
        block: 'b1',
        mods: { a: 'b' }
      }, { block: 'b1', mods: { a: 'b' }, content: { elem: 'e1' } });
    });

    it('should match on changed mods', function() {
      test(function() {
        block('b1').content()(function() {
          return { elem: 'e1' };
        });

        block('b1').elem('e1').mod('a', 'b').content()('ok');
        block('b1').elem('e1').def()(function() {
          return local({ 'mods.a': 'b' })(function() {
            return applyNext();
          });
        });
      }, {
        block: 'b1'
      }, { block: 'b1', content: { elem: 'e1', content: 'ok' } });
    });

    it('should propagate parent mods to matcher', function() {
      test(function() {
        block('b1').content()(function() {
          return { elem: 'e1' };
        });

        block('b1').elem('e1').mod('a', 'b').content()('ok');
      }, {
        block: 'b1',
        mods: { a: 'b' }
      },
      { block: 'b1', mods: { a: 'b' }, content: {
        elem: 'e1', content: 'ok' }
      });
    });

    it('should restore mods', function() {
      test(function() {
        block('b2').content()(function() {
          return this.mods.a || 'yes';
        });
      }, {
        block: 'b1',
        mods: { a: 'b' },
        content: {
          block: 'b2'
        }
      },
      { block: 'b1', mods: { a: 'b' }, content: {
        block: 'b2', content: 'yes' }
      });
    });

    it('should lazily override mods without propagating them', function() {
      test(function() {
        block('b1').def()(function() {
          return applyNext({ 'mods.a': 'yes' });
        });

        block('b1').mod('a', 'yes').content()(function() {
          return [
            'yes',
            applyNext()
          ];
        });

        block('b2').mod('a', 'yes').content()('no!')
      }, {
        block: 'b1',
        content: {
          block: 'b2'
        }
      }, { block: 'b1', content: [
        'yes', { block: 'b2' }
      ] });
    });
  });

  describe('elemMods', function() {
    it('should lazily define elemMods', function() {
      test(function() {
        block('b1').content()(function() {
          return this.elemMods.a || 'yes';
        });
      }, { block: 'b1' }, { block: 'b1', content: 'yes' });
    });

    it('should take elemMods from BEMJSON', function() {
      test(function() {
        block('b1').content()(function() {
          return this.elemMods.a || 'no';
        });
      }, {
        block: 'b1',
        elemMods: {
          a: 'yes'
        }
      }, { block: 'b1', elemMods: { a: 'yes' }, content: 'yes' });
    });

    it('should restore elemMods', function() {
      test(function() {
        block('b2').content()(function() {
          return this.elemMods.a || 'yes';
        });
      }, {
        block: 'b1',
        elemMods: {
          a: 'no'
        },
        content: {
          block: 'b2'
        }
      }, { block: 'b1', elemMods: { a: 'no' }, content: {
        block: 'b2', content: 'yes' }
      });
    });
  });

  describe('Context', function() {
    it('should have proper this.position', function() {
      test(function() {
        block('b1').content()(function() {
          return applyNext() + ' == ' + this.position;
        });
      }, [
        { block: 'b1', content: 1 },
        { block: 'b1', content: 2 },
        '',
        { block: 'b1', content: 3 },
        {
          customField: 'qqq'
        },
        { block: 'b1', content: 4 }
      ], [
        { block: 'b1', content: '1 == 1' },
        { block: 'b1', content: '2 == 2' },
        '',
        { block: 'b1', content: '3 == 3' },
        {
          customField: 'qqq'
        },
        { block: 'b1', content: '4 == 4' }
      ]);
    });

    it('should support `.getLast()`', function() {
      test(function() {
        block('b1')(
          match(function() { return this.isLast(); })
          .content()('last')
        );
      }, [
        {
          tag: 'table',
          content: {
            block: 'b1',
            content: [
              { content: 1 },
              { content: 2 }
            ]
          }
        },
        {
          block: 'b1',
          content: 'first'
        },
        {
          block: 'b1'
        }
      ], [
        {
          tag: 'table',
          content: {
            block: 'b1',
            content: [
              { content: 1 },
              { content: 2 }
            ]
          }
        },
        {
          block: 'b1',
          content: 'first'
        },
        {
          block: 'b1',
          content: 'last'
        }
      ]);
    });

    it('should support changing prototype of BEMContext', function () {
      test(function() {
        oninit(function(exports) {
          exports.BEMContext.prototype.yes = 'hah';
        });

        block('b1').content()(function() {
          return this.yes;
        });
      }, { block: 'b1' }, { block: 'b1', content: 'hah' });
    });

    it('should put BEMContext to sharedContext too', function () {
      test(function() {
        oninit(function(exports, shared) {
          shared.BEMContext.prototype.yes = 'hah';
        });

        block('b1').content()(function() {
          return this.yes;
        });
      }, { block: 'b1' }, { block: 'b1', content: 'hah' });
    });
  });

  describe('wildcard block', function() {
    it('should be called before the matched templates', function () {
      test(function() {
        block('b1').content()(function() {
          return 'ok';
        });
        block('b2').content()(function() {
          return 'yes';
        });
        block('*').content()(function() {
          return '#' + applyNext() + '#';
        });
      }, [
        { block: 'b1' },
        { block: 'b2' },
        {
          block: 'b3',
          content: 'ya'
        }
      ], [
        {
          block: 'b1',
          content: '#ok#'
        },
        {
          block: 'b2',
          content: '#yes#'
        },
        {
          block: 'b3',
          content: '#ya#'
        }
      ]);
    });
  });

  describe('wildcard elem', function() {
    it('should be called before the matched templates', function () {
      test(function() {
        block('b1').content()(function() {
          return 'block';
        });
        block('b1').elem('a').content()(function() {
          return 'block-a';
        });
        block('b1').elem('*').content()(function() {
          return '%' + applyNext() + '%';
        });
      }, [
        { block: 'b1' },
        {
          block: 'b1',
          elem: 'a'
        },
        {
          block: 'b3',
          elem: 'b',
          content: 'ok'
        }
      ],
      [
        {
          block: 'b1',
          content: 'block'
        },
        {
          block: 'b1',
          elem: 'a',
          content: '%block-a%'
        },
        {
          block: 'b3',
          elem: 'b',
          content: '%ok%'
        }
      ]);
    });
  });

  describe('adding templates at runtime', function() {
    it('should work', function() {
      var template = bemxjst.compile();

      assert.deepEqual(template.apply({ block: 'b1' }), { block: 'b1' });

      template.compile(function() {
        block('b1').content()('ok');
      });

      assert.deepEqual(
        template.apply({ block: 'b1' }), { block: 'b1', content: 'ok' }
      );

      assert.deepEqual(
        template.apply({ block: 'b2' }), { block: 'b2' }
      );

      template.compile(function() {
        block('b2').content()('ok');
      });

      assert.deepEqual(
        template.apply({ block: 'b1' }), { block: 'b1', content: 'ok' }
      );

      assert.deepEqual(
        template.apply({ block: 'b2' }), { block: 'b2', content: 'ok' }
      );

      template.compile(function() {
        block('b1').def()('new');
      });

      assert.deepEqual(template.apply({ block: 'b1' }), 'new');
      assert.deepEqual(
        template.apply({ block: 'b2' }), { block: 'b2', content: 'ok' }
      );
    });
  });

  it('should work with empty input', function() {
    test(function() {
    }, '', '');
  });

  it('should work with null input', function() {
    test(function() {
    }, null, null);
  });

  it('should work with 0 input', function() {
    test(function() {
    }, 0, 0);
  });

  it('should not render `undefined`', function () {
    test(function() {}, undefined, undefined);
  });

  it('should render falsy in array as is', function () {
    test(function() {
    }, [
      null,
      '',
      undefined,
      { block: 'b1' },
      undefined,
      0
    ], [
      null, '', undefined, { block: 'b1' }, undefined, 0
    ]);
  });

  it('should throw error when args passed to def mode', function() {
    assert.throws(function() {
      bemxjst.compile(function() {
        block('b1').def('blah');
      });
    });
  });

  it('should throw error when args passed to replace mode', function() {
    assert.throws(function() {
      bemxjst.compile(function() {
        block('b1').replace('blah');
      });
    });
  });

  it('should throw error when args passed to extend mode', function() {
    assert.throws(function() {
      bemxjst.compile(function() {
        block('b1').extend('blah');
      });
    });
  });

  it('should throw error when args passed to wrap mode', function() {
    assert.throws(function() {
      bemxjst.compile(function() {
        block('b1').wrap('blah');
      });
    });
  });

  it('should throw error when args passed to once mode', function() {
    assert.throws(function() {
      bemxjst.compile(function() {
        block('b1').once('blah');
      });
    });
  });

  it('should throw error when args passed to content mode', function() {
    assert.throws(function() {
      bemxjst.compile(function() {
        block('b1').content('blah');
      });
    });
  });
});
