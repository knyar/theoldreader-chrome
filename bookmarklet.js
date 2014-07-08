function ator(z) {
  b = new TORB();
  b.ai(z);
}

var TORB = function() {};

TORB.prototype = {

  //add iframe
  ai: function(win) {
    var f = document.createElement('form');
    f.setAttribute('method','post');
    f.setAttribute('action','//theoldreader.com/bookmarks/bookmark');
    f.setAttribute('target','_tor_share');

    var f1 = document.createElement('input');
    f1.setAttribute('type','hidden');
    f1.setAttribute('name','saved_post[url]');
    f1.setAttribute('value',document.location.href);
    f.appendChild(f1);

    var f2 = document.createElement('input');
    f2.setAttribute('type','hidden');
    f2.setAttribute('name','saved_post[content]');
    f2.setAttribute('value',this.gst());
    f.appendChild(f2);

    document.getElementsByTagName('body')[0].appendChild(f);
    f.submit();
  },

  //get selected text
  gst: function() {
    var html = "";
    if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var container = document.createElement("div");
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }
            html = container.innerHTML;
        }
    } else if (typeof document.selection != "undefined") {
        if (document.selection.type == "Text") {
            html = document.selection.createRange().htmlText;
        }
    }
    return html;
  }
};

ator(window);
