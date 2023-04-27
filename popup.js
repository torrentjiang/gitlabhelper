$(function() {

	// 加载设置
	var defaultConfig = {color: 'white'}; // 默认配置
	chrome.storage.sync.get(defaultConfig, function(items) {
		document.body.style.backgroundColor = items.color;
	});

});

$('.serviceInput').bind('input propertychange', function() {
    // $('#content').html($(this).val().length + ' characters');
    const el_value = $('.serviceInput').val();
    
    $.get(`https://gitlab.saicmobility.com/api/v4/projects.json?search=${el_value || ''}&per_page=20&simple=true&membership=true&order_by=last_activity_at`, {
    },function(params) {
        const selectParent = document.querySelector('.projectContent');
        selectParent.firstChild && selectParent.removeChild(selectParent.firstChild);
        const childInner = document.createElement('div');
        childInner.setAttribute('class', 'optionsInner');

        params.map((item)=>{
            const el = document.createElement('p');
            el.setAttribute('class', 'pro_Item');
            el.onclick = function () {
              const dumpHerf = item.web_url;
              chrome.tabs.create({url: dumpHerf});
            }
            const text = document.createTextNode(item.name);
            el.appendChild(text);
            childInner.append(el);
          });
          selectParent.append(childInner)
    });
});

// $('.jumpButton').oninput(e => {
//     const el_value = $('.serviceInput').val();
    
//     $.get(`https://gitlab.saicmobility.com/api/v4/projects.json?search=${el_value || ''}&per_page=20&simple=true&membership=true&order_by=last_activity_at`, {
//     },function(params) {
//         const selectParent = document.querySelector('.projectContent');
//         selectParent.firstChild && selectParent.removeChild(selectParent.firstChild);
//         const childInner = document.createElement('div');
//         childInner.setAttribute('class', 'optionsInner');

//         params.map((item)=>{
//             const el = document.createElement('p');
//             el.setAttribute('class', 'pro_Item');
//             el.onclick = function () {
//               const dumpHerf = item.web_url;
//               chrome.tabs.create({url: dumpHerf});
//             }
//             const text = document.createTextNode(item.name);
//             el.appendChild(text);
//             childInner.append(el);
//           });
//           selectParent.append(childInner)
//     });
// });