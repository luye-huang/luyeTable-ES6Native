/**
 * Created by luye on 01/06/2017.
 */
import LuyeTable from './luyeTable-es6/luyeTable';
import {data} from './luyeTable-es6/data';
function aa() {
    console.log(arguments);
}
function tdRender(data) {
    return `<span style="color:green">${data}</span>`;
}
function filNum(val) {
    return val > 120 ? 'BIG' : val;
}
var tbParam = {
    el: document.getElementById('table'),
    columns: [{cname: '团队名称', cdata: 'tname', action: 'click', trigger: aa},
        {cname: '代码行总数', cdata: 'code_count', style: 'hide'},
        {cname: '提交文件总数', cdata: 'file_count', filter: filNum},
        {cname: '团队总得分', cdata: 'tscore', action: 'click', trigger: aa},
        {cname: 'template', template: '<span style="color:red">888</span>'},
        {cname: 'tdrender', template: '<span style="color:red">888</span>', tdRender: tdRender, cdata: 'code_count'},
        {cname: '操作', type: 'management'}
    ],
    manageColumns: true,
    globalSearch: true,
    export: true
};

const tb = new LuyeTable(tbParam);

document.getElementById('test').addEventListener('click', refresh);
function refresh(){
    tb.query([{"file_count": 186, "tid": 627, "tname": "会员增值服务组", "tscore": "65.67", "code_count": 3306}, {
        "file_count": 335,
        "tid": 630,
        "tname": "平台-会员平台",
        "tscore": "48.29",
        "code_count": 16267
    }]);
    // console.log(tb, data);
}
