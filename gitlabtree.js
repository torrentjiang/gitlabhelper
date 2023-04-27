var GitlabTree = (function($, win) {
  var private_token,
    project_id,
    repository_ref,
    apiRepoTree,
    originUrl,
    initContainerML,
    $jstree,
    repoName,
    apiFileContent
    ;

  var getPrivateToken = function(dtd) {
    var arrXmlNode;
    var objXml = {};
    var wholeText;

    if ($('head script[type="text/javascript"]').contents()[0]) {
      wholeText = $('head script[type="text/javascript"]').contents()[0]['wholeText'];
    }

    if (wholeText) {
      if (!/window.gon/ig.test(wholeText)) {
        return;
      }
    } else {
      if ($('head script').contents()[0]) {
        wholeText = $('head script').contents()[0]['wholeText'];
      }

      if (!wholeText) {
        return;
      } else {
        if (!/window.gon/ig.test(wholeText)) {
          // return;
        }
      }
    }

    if ($('head script[type="text/javascript"]').contents()[0]) {
      arrXmlNode = wholeText.toString().split(';')
    } else {
      if ($('head script').contents()[0]) {
        arrXmlNode = wholeText.toString().split(';')
      } else {
        return false;
      }
    }

    for (var i = 1; i < arrXmlNode.length - 1; i++) {
      var item = arrXmlNode[i].split('=');
      var key = item[0];
      var value = item[1];
      objXml[key] = value;
    }
    for (var key in objXml) {
      if (key === 'gon.api_token') {
        private_token = objXml[key];
      }
    }

    if (private_token) {
      private_token = private_token.replace(/\"/g, '');
    } else {
      if (isFilesTab()) {
        tryToGetTokenInGitlab9(function(result) {
          if (result && result != 401) {
            private_token = result;
            dtd.resolve(true);
          } else {
            quit();
            dtd.reject(false);
          }
        });
      }
    }
  }

  var tryToGetTokenInGitlab9 = function(callback) {
    $.ajax(window.location.origin + '/profile/account')
      .then(function(data, status) {
        private_token = 'NkY8WRtC0n5aUecz6zmr/M/eZe25pGDe3xzJBNCs22FFmIzxqmgtSdLaKClsQbHD3MstGsYZO2WHNv8vRUPrIg==';
        if (private_token) {
          callback && callback(private_token);
        } else {
          console.log('Not private_token.');
        }
      })
      .fail(function(err) {
        if (err.status && err.status === 401) {
          console.log('Not Login.');
          callback && callback(err.status);
          return;
        }
      });
  }

  var initVariables = function() {
    project_id = $('#project_id').val() || $('#search_project_id').val();
    repoName = $('.context-header').children().attr('href').slice(1);
    repository_ref = $('#repository_ref').val();
    originUrl = window.location.origin;

    var apiRootUrl = originUrl + '/api/v4/projects/';
    apiProjects = apiRootUrl;
    apiRepoTree = apiRootUrl + project_id + '/repository/tree';
    apiFileContent = originUrl + '/' + repoName + '/files/';

    var tmpClassName = $('.container').length > 0 ? '.container' : '.content-wrapper .container-fluid';
    initContainerML = $(tmpClassName).offset() && $(tmpClassName).offset().left;
  }

  var generateTreeNodes = function(serverResult) {
    var nodesDisplay = [];
    serverResult.forEach(function(item) {
      var singleObj = {};
      singleObj.text = item.name;
      if (item.type === 'tree') {
        singleObj.children = [];
        singleObj.data = 'tree';
        singleObj.icon = 'fa fa-folder';
      } else if (item.type === 'blob') {
        singleObj.icon = 'fa fa-file-o';
        singleObj.data = 'blob';
      }
      nodesDisplay.push(singleObj);
    });
    return nodesDisplay;
  }

  var getLocalStorageData = function() {
    var strClickedDir = localStorage.getItem('loadedDirs');
    var lastElement;
    var arrClickedDir = strClickedDir && strClickedDir.split(',') || [];
    if (arrClickedDir.length > 0) {
      lastElement = arrClickedDir[arrClickedDir.length - 1] || '';
    }
    return {
      lastElement: lastElement,
      arrAllLoadedDirs: arrClickedDir,
    }
  }

  var setLocalStorageData = function(str) {
    if (str.length === 0) {
      return;
    } else {
      localStorage.setItem('loadedDirs', str);
    }
  }

  var getResultJson = function(path) {
    var promise = new Promise(function(resolve, reject) {
      $.get(apiRepoTree, {
        per_page: 10000,
        ref: "master",
        path: path,
      }, function(result) {
        resolve(result);
      });
    });
    return promise;
  }

  var createNodeById = function(nodesDisplay, nodeid) {
    var cnode = $jstree.jstree(true).get_node(nodeid);
    if (cnode.data === 'tree') {
      nodesDisplay.forEach(function(item) {
        var newNodeObj = $jstree.jstree(true).create_node(cnode, item, 'last', function(data) {
          // console.log('new node created.');
          // console.log(data);
        });
        $jstree.jstree(true).open_node(cnode);
      });
    } else {
      console.log('cnode type is ' + cnode.data);
    }
  }

  // src/main/webapp
  // --------->
  // ['src', 'src/main', 'src/main/webapp']
  var makeRequestArr = function(str) {
    var arr = [];
    var arrSplited = str.split('/');
    arr.push(arrSplited[0]);
    arrSplited.reduce(function(prev, current, currentIndex){
      var tmpValue =  prev + '/' + current;
      arr.push(tmpValue);
      return tmpValue;
    });
    return arr;
  }

  var handleRefresh = function() {
    var lastElement = getLocalStorageData().lastElement || '';
    var requestPath = lastElement ? makeRequestArr(lastElement) : [];
    var promises = requestPath.map(function(path) {
      return getResultJson(path);
    });
    Promise.all(promises)
      .then(function(data) {
        if (data.length > 0 && data[0].length > 0) {
          data.forEach(function(item, index) {
            var nodesDisplay = generateTreeNodes(item);
            var cssSelector = (index === 0) ? '.jstree .jstree-container-ul li a' : '.jstree .jstree-container-ul li.jstree-open ul li';
            expandSubTreeByJSON(cssSelector, requestPath, lastElement, nodesDisplay);
          });
        } else {
          $('.jstree .jstree-container-ul li a').each(function(index, item) {
            var text = $(item).text().trim();
            if (text === lastElement) {
              $(this).parent().find('div.jstree-wholerow').addClass('jstree-wholerow-clicked');
            }
          });
        }
      })
      .catch(function(err) {
        console.error(err);
      });
  }

  var expandSubTreeByJSON = function(cssSelector, requestPath, lastElement, nodesDisplay) {
    $(cssSelector).each(function (index, element) {
      var nodeid;
      var text = $(element).text().trim();
      if (text === requestPath[0]) {
        nodeid = $(this).parent().attr('id');
        // $(this).parent().find('div.jstree-wholerow').addClass('jstree-wholerow-clicked');
        createNodeById(nodesDisplay, nodeid);
      } else if(lastElement.split('/').indexOf(text) > -1) {
        nodeid = element.id;
        $(this).find('div.jstree-wholerow').addClass('jstree-wholerow-clicked');
        createNodeById(nodesDisplay, nodeid);
      }
    });
  }

  // 处理右侧gitlab的宽度
  var hackStyle = function() {
    if (location.href.indexOf('gitlab.com') > -1) {
      $('.sidebar-wrapper').hide();
      $('.gitlab-tree').css('width', '230px');
      $('header.navbar').css('margin-left', '230px');
    } else {
      hideGitlabTree();
      $('body').css('overflow', 'hidden');
    }

    $('.breadcrumb').addClass('vh');
  }

  var handlePJAX = function() {
    if ($.support.pjax) {
      // $(document).on('pjax:complete', function() {
      //   $('pre code').each(function(i, block) {
      //     hljs.highlightBlock(block);
      //   });
      // });

      $(document).on('pjax:start', function() {
        NProgress.start();
        showLoading();
      });
      $(document).on('pjax:end', function() {
        NProgress.done();
        hideLoading();

        $('pre code').each(function(i, block) {
          hljs.highlightBlock(block);
        });
      });
    }
  }

  var isFilesTab = function() {
    var hasProjectDom = $('.shortcuts-project')[0];
    if (hasProjectDom) {
      return true;
    } else {
      return false;
    }
  }

  var revertPath = function(revertedPathString) {
    var retString = '';
    var arrString = revertedPathString.split('/');

    // 1 删除空元素
    arrString.forEach(function(item, index) {
      if (item === '') {
        removeElement(index, arrString);
      }
    });

    // 2.倒序排列
    for (var i = arrString.length - 1; i >= 0; i--) {
      var item = arrString[i];
      retString += item + '/';
    };

    // 3.去掉最后一个/
    if (retString.substr(retString.length - 1) === '/') {
      retString = retString.substr(0, retString.length - 1);
    }

    return retString;
  }

  var removeElement = function(index, array) {
    if (index >= 0 && index < array.length) {
      for (var i = index; i < array.length; i++) {
        array[i] = array[i + 1];
      }
      array.length = array.length - 1;
    }
    return array;
  }

  var createGitlabTreeContainer = function() {
    var htmlTemplate = `<div class="gitlab-tree" style="display: none;">\
                          <header>\
                              <div class="head">\
                                  <div class="info">\
                                      <i class="fa fa-lock"></i><span style="margin-left: 10px;"></span>\
                                  </div>\
                                  <div style="display: flex; align-items: center">\
                                    <i class="fa fa-code-fork"></i><span class="branch"></span>\
                                  </div>\
                                  <a class="gitlabtree_toggle toggle-btn icon-white icon-arraw-left toggle-btn-color">\
                                      <div class="loader icon-loading" style="display: none;"></div>\
                                  </a>\
                              </div>\
                          </header>`;
    htmlTemplate += '<div class="open-dialog">🔍</div>';
    htmlTemplate += '<nav></nav></div>';
    // htmlTemplate += `<div class="select-wrapper"><input type="text" class="select-input" placeholder="请选择">\
		// <div class="select-options"></div></div></div>`;
    var modalEle = `<div id="dialog" class="spantree-search" style="display:none;">\
      <div class="spantree-searchbar">\
        <input class="select-input" type="text" placeholder="🔍  ctrl + ] 快捷搜索" value="">\
        <div class="select-options"></div>\
      </div>\
    </div>`;
    $('body').append(modalEle);
    $('body').append(htmlTemplate);
    showModal();
    $('.gitlab-tree div.info span').text(repoName);
    $('.gitlab-tree span.branch').text(repository_ref);
  }

  var showModal = function () {
    const selectWrapper = document.querySelector('.spantree-searchbar');
		const selectInput = selectWrapper.querySelector('.select-input');
		const selectOptions = selectWrapper.querySelector('.select-options');

    $(".open-dialog").click(function() {
      $("#dialog").show();
      $(".select-input").focus();
      const elInner = document.createElement('div');
      elInner.setAttribute('class', 'optionsInner')
      selectOptions.append(elInner)
      const selectOptionsInner = selectWrapper.querySelector('.optionsInner');
      totalData.map((item)=>{
        const el = document.createElement('p');
        el.setAttribute('class', 'optionItem');
        el.onclick = function () {
          const dumpHerf = originUrl + '/' + repoName + '/blob/' + repository_ref + '/' + item.label;
          // console.log('dumpHerf:', dumpHerf)
          window.location.href = dumpHerf;
          // history.replaceState(null, null, dumpHerf);
        }
        const text = document.createTextNode(item.label);
        el.appendChild(text)
        selectOptionsInner.append(el)
      });
    })
    $(".select-input").blur(function () {
      setTimeout(() => {
        $("#dialog").hide();
        selectOptions.removeChild(selectOptions.firstChild)
      }, 100);
    })

    const totalData = [];
    const pre10data = [];
    $.get(`${apiFileContent}${repository_ref}`, {
      format: "json"
    }, function(result) {
      result.map((item, index)=>{
        if (index <= 9 ) {
          pre10data.push({
            value: item,
            label: item
          })
        }
        totalData.push({
          value: item,
          label: item
        })
      })
    });

    selectInput.addEventListener('input', function() {
			const filterValue = selectInput.value.toLowerCase();
			const selectOptionItems = selectOptions.querySelectorAll('p');
			selectOptionItems.forEach(function(item) {
				if (item.textContent.toLowerCase().indexOf(filterValue) > -1) {
					item.style.display = 'block';
				} else {
					item.style.display = 'none';
				}
			});
		});
  }


  var createGitlabTree = function(result) {
    var treeData = generateTreeNodes(result);
    $jstree = $('.gitlab-tree nav')
      .jstree({
        'core': {
          'data': treeData,
          'check_callback': true,
          'dblclick_toggle': false,
        },
        plugins: ['wholerow']
      })
      .on('ready.jstree', function(event, data) {
        handleRefresh();
      });
  }

  var clickNode = function() {
    $jstree.on("select_node.jstree", function(e, data) {
      var selectNode = $jstree.jstree('get_selected');
      if (data && data.node && data.node.data == 'tree') {
        var isOpen = $(".gitlab-tree nav").jstree(true).is_open(data.node);
        if (isOpen) {
          return;
        }
        var path = data.node.text;
        var currentNodeId = data.node.id;
        var parentNode = $jstree.jstree(true).get_parent(currentNodeId);

        // 获取select节点+ 父节点的text
        var currentNodeText = data.node.text;
        var arrParents = data.node.parents;

        path = currentNodeText + '/';

        // 获取当前select节点+所有父节点的text  ["j1_13", "j1_3", "#"]
        arrParents.forEach(function(item) {
          if (item !== '#') {
            var tmpText = $jstree.jstree(true).get_text(item);
            path += tmpText + '/';
          }
        });
        path = revertPath(path);
        var arrAllDirs = getLocalStorageData().arrAllLoadedDirs;
        if (arrAllDirs[arrAllDirs.length - 1] === path) {
          console.log('loaded the same path, abort');
          return;
        }

        $.get(apiRepoTree, {
          per_page: 10000,
          ref: "master",
          path: path,
        }, function(result) {
          var arrClickedDir = getLocalStorageData().arrAllLoadedDirs;
          if (arrClickedDir && arrClickedDir.length > 0) {
            arrClickedDir.push(path);
            setLocalStorageData(arrClickedDir.join(','));
          } else {
            setLocalStorageData(path);
          }
          var nodesDisplay = generateTreeNodes(result);
          nodesDisplay.forEach(function(item) {
            var ids = $jstree.jstree(true).create_node(selectNode, item, 'last');
          });
          // $(".gitlab-tree nav").jstree(true).open_all();
          // $(".gitlab-tree nav").jstree(true).close_all();
          $jstree.jstree(true).open_node(selectNode);
        });
      } else { // blob
        var href = getClickedPath(data).fullPath;
        var filePath = getClickedPath(data).filePath;

        var arrClickedDir = getLocalStorageData().arrAllLoadedDirs;
        if (arrClickedDir[arrClickedDir.length - 1] === filePath) {
          console.log('loaded the same path, abort');
          return;
        }
        if (arrClickedDir && arrClickedDir.indexOf(filePath) < 0) {
          arrClickedDir.push(filePath);
          setLocalStorageData(arrClickedDir.join(','));
        } else {
          setLocalStorageData(filePath);
        }

        if ($(".blob-viewer").length > 0) {
          showLoading();
          var arrSplitFile = filePath.split('/');
          var fileName = (arrSplitFile.length > 0) && arrSplitFile[arrSplitFile.length - 1] || '';
          $('.file-holder .file-title-name').text(fileName);
          var query;
          if (fileName.toLowerCase().indexOf('.md') > -1 ||
              fileName.toLowerCase().indexOf('.png') > -1 ||
              fileName.toLowerCase().indexOf('.jpg') > -1 ||
              fileName.toLowerCase().indexOf('.jpeg') > -1 ||
              fileName.toLowerCase().indexOf('.gif') > -1
            ) {
            query = '?format=json&viewer=rich';
          } else {
            query = '?format=json&viewer=simple';
          }
          $.ajax({
            type: "GET",
            url: href + query,
            dataType: 'json',
            success: function (result) {
              if ($(".blob-viewer").length > 1) {
                $(".blob-viewer.hidden").remove();
                $(".blob-viewer").empty();
              }
              $(".blob-viewer").replaceWith(result.html);
              $(".blob-viewer .file-content").addClass('white');
              hideLoading();
              // history.pushState(null, null, href);
              if ($('.breadcrumbs-sub-title').children()[0].innerText === 'Details') {
                window.location.href = href;
              } else {
                history.replaceState(null, null, href);
              }
            }
          });
        } else {
          window.location.href = href;
        }
      }
    });

    // handle open node state
    openCloseNode();
  }

  var openCloseNode = function() {
    $jstree.on("before_open.jstree", function(e, data) {
      showLoading();
    });

    $jstree.on("after_open.jstree", function(e, data) {
      hideLoading();
    });
  }

  var getClickedPath = function(data) {
    var path = data.node.text + '/';
    var arrParents = data.node.parents;

    // data.node.parents ["j1_13", "j1_3", "#"]
    arrParents.forEach(function(item) {
      if (item !== '#') {
        var tmpText = $jstree.jstree(true).get_text(item);
        path += tmpText + '/';
      }
    });

    path = revertPath(path);

    // http://gitlab.xxx.com /   mobile/m-web           /blob/   master            /     src/main/webapp/resource/loader.js
    var href = originUrl + '/' + repoName + '/blob/' + repository_ref + '/' + path;

    return {
      filePath: path,
      fullPath: href,
    };
  }

  var handleToggleBtn = function() {
    $('.gitlab-tree header a.toggle-btn').on('click', function() {
      hideGitlabTree();
      createBtn();
    });
  }

  var createBtn = function() {
    if ($('.open-tree').length === 0) {
      var htmlTemplate = '<div class="open-tree fa fa-angle-right"></div>';
      if (isFilesTab()) {
        $('body').append(htmlTemplate);
      }

      $('.open-tree').on('click', function() {
        showGitlabTree();
      });
    } else {
      if (isFilesTab()) {
        $('.open-tree').show();
      }
    }
  }

  var hideGitlabTree = function() {
    $('.gitlab-tree').hide('fast');
    updateLayoutUI('hide');
  }

  var showGitlabTree = function() {
    $('.gitlab-tree').show('fast');
    updateLayoutUI('show');
  }

  var updateLayoutUI = function(operateType) {
    var tmpClassName = $('.container').length > 0 ? '.container' : '.content-wrapper .container-fluid';
    var currentContainerML = $(tmpClassName).offset() && $(tmpClassName).offset().left;
    if (operateType === 'hide') {
      if (+currentContainerML > +initContainerML) {
        $(tmpClassName).offset({left: initContainerML});
      }
    } else {
      $(tmpClassName).offset({left: 300})
    }
  }

  var showLoading = function() {
    $('.loader').show();
    $('.toggle-btn').removeClass('toggle-btn-color');
  }

  var hideLoading = function() {
    $('.loader').hide();
    $('.toggle-btn').addClass('toggle-btn-color');
  }

  var showSpinner = function() {
    $('.open-tree')
      .removeClass('fa fa-angle-right')
      .addClass('busy')
      .append('<i class="fa fa-spinner fa-spin"></i>');
  }

  var hideSpinner = function() {
    $('.open-tree')
      .addClass('fa fa-angle-right')
      .removeClass('busy');
    $('.open-tree i').removeClass('fa fa-spinner fa-spin');
  }

  var hotkey = function() {
    $(document).keydown(function(e) {
      if(e.ctrlKey && e.keyCode === 219){
        toggleSideBar();
      }
      if(e.ctrlKey && e.keyCode === 221){
        $('.open-dialog').click()
      }
    })
  }

  var toggleSideBar = function() {
    if ($('.gitlab-tree:visible').length > 0) {
      hideGitlabTree();
    } else {
      showGitlabTree();
    }
  }

  var quit = function() {
    hideSpinner();
    $('.open-tree').hide();
  }

  var init = function(next) {
    var p = new Promise(function(resolve, reject) {
      $.Deferred(getPrivateToken)
      .done(function(status) {
        resolve(status);
        if (isFilesTab()) {
          $(window).resize(function() {
            updateLayoutUI('show');
          });
        }
        createBtn();
        showSpinner();
        initVariables();
      })
      .fail(function(status) {
        console.warn("Error: ", status);
        reject(status);
      });
    });

    p.then(function(status) {
      next();
    }).catch(function(status) {
      console.error('Error: ', status);
      return;
    });
  }

  var getApiProjects = function() {
    if (isFilesTab()) {
      $.get(apiRepoTree, {
        per_page: 10000,
        ref: "master"
      }).done(function(result) {
        hideSpinner();
        createGitlabTreeContainer();
        createGitlabTree(result);
        clickNode();
        handlePJAX();
        handleToggleBtn();
        hotkey();
        hackStyle();
      });
    }
  }

  return {
    init: init,
    action: getApiProjects,
  }
})(jQuery, window);

// if exist jQuery object
if (jQuery) {
  $(function() {
    GitlabTree.init(GitlabTree.action);
  });
}
