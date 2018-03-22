/**
 * Created by luye on 01/06/2017.
 */
import LuyeTable from './luyeTable-es6/luyeTable';

console.log(6622);
function aa() {
    console.log(arguments);
}
var tbParam = {
    el: document.getElementById('table'),
    columns: [{cname: '团队名称', cdata: 'tname', action: 'click', trigger: aa},
        {cname: '代码行总数', cdata: 'code_count', style: 'hide'},
        {cname: '提交文件总数', cdata: 'file_count'},
        {cname: '团队总得分', cdata: 'tscore', action: 'click', trigger: aa},
        {cname: '操作', type: 'management'}
    ],
    manageColumns: true
};

const tb = new LuyeTable(tbParam);
