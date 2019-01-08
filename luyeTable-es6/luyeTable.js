import {data} from './data';
import './luyeTable.less';
import 'babel-polyfill';
import deepClone from 'lodash.clonedeep';
import sortBy from 'lodash.sortby';
import saver from 'file-saver';

export default class LuyeTable {
    constructor(param) {
        this.initialize(param);
    }

    initialize(param) {
        this.param = {
            el: null,
            data: null,
            url: null,
            columns: null,
            // optional
            dirtyCheck: false,
            export: false,
            pagination: false,
            pageCount: 20,
            globalSearch: false,
            manageColumns: false,
            management: false,
            //initial value lost at first evaluation
            managePageSize: false,
            tableClass: '',
        };
        this.param = Object.assign(this.param, param);
        this.initData();
        this.metadata = {
            processingData: deepClone(this.param.data),
            processingColumns: deepClone(this.param.columns),
            currentData: null,
            currentPage: 1,
            pageTotal: 0
        };
        if (this.param.dirtyCheck) {
            this.checkDirtyData(this.param.data, this.metadata.processingColumns);
        }
        this.getCurrentData();
        if (!this.metadata.processingData) {
            alert('no data');
            return;
        }
        this.interceptValueType();
        this.adjustContainer();
        this.render();
    }

    initData() {
        if (this.param.url) {

        }
        else if (this.param.data) {

        }
        else {
            this.param.data = data.res;
        }
    }

    getCurrentData() {
        const pageStart = (this.metadata.currentPage - 1) * this.param.pageCount;
        const pageEnd = pageStart + this.param.pageCount;
        this.metadata.currentData = this.metadata.processingData.slice(pageStart, pageEnd);
    }

    //in case that provided data has more attributes than the table needs
    checkDirtyData(data, columns) {
        data.forEach(item => {
            let obj = {};
            columns.forEach(column => {
                obj[column] = item[column];
            });
            return obj;
        });
    }

    //reset to initial data
    resetData() {
        if (this.param.data) {
            this.metadata.currentPage = 1;
            this.metadata.processingData = deepClone(this.param.data);
        }
    }

    interceptValueType(integerAttrs = ['currentPage', 'pageCount']) {
        const integerProtectorHandler = {
            set: function (obj, prop, value) {
                if (integerAttrs.includes(prop)) {
                    if (typeof value !== 'number') {
                        value = Number.parseInt(value);
                    }
                }
                // without returning true it will cause a 'trap returned falsish'
                Reflect.set(obj, prop, value);
                return true;
            }
        };
        this.param = new Proxy(this.param, integerProtectorHandler);
        this.metadata = new Proxy(this.metadata, integerProtectorHandler);
    }

    //create room for a set of controls like export button, cross-table query input
    adjustContainer() {
        this.param.el.style.position = 'relative';
        this.param.el.style.paddingTop = '20px';
    }

    render() {
        // const variables that cannot be reevaluated but can do dom manipulation
        this.wdtb = document.createElement('table');
        this.wdtb.setAttribute('id', 'LuyeTable');
        if (this.tableClass) {
            this.wdtb.classList.add(this.tableClass);
        }
        this.renderHead();
        this.renderBody();
        this.param.el.innerHTML = '';
        this.param.el.appendChild(this.wdtb);
        this.param.pagination && this.renderPages();
        this.param.managePageSize && this.renderLeftBoard();
        this.renderRightBoard();
        this.bindDelegates();
    }

    renderHead() {
        this.wdtb.querySelector('thead') && (this.wdtb.querySelector('thead').remove());
        const thead = document.createElement('thead');
        const tpl = `<tr>
          ${this.metadata.processingColumns.map(column => `
             <th class='${column.style == "hide" ? "hide" : ""}'>${column.cname}<input type="checkbox" class="hide" ${column.style == "hide" ? "value='off'" : "checked='checked'"}/><div class="${column.type === undefined || column.type === 'a' ? '' : 'hide'}"><div class="tangle-up arrows"></div><div class="tangle-down arrows"></div></div></th>`)
            }
        </tr>`;
        thead.innerHTML = tpl;
        //一个坑, innerHTML赋值时会出现,,,结尾
        if (thead.childNodes[1] && thead.childNodes[1].nodeType == 3) {
            thead.childNodes[1].remove();
        }
        this.wdtb.appendChild(thead);
    }

    renderLeftBoard() {
        const div = document.createElement('div');
        div.classList.add('left-board');
        div.innerHTML = `<label>每页数: </label><select>
          ${[10, 20, 30, 50].map(option => `
            <option value=${option} ${this.param.pageCount == option ? "selected='selected'" : ""}>${option}</option>
          `)}
        </select>`;
        this.wdtb.parentNode.insertBefore(div, this.wdtb);
        this.attachPageSizeEvent(div);
    }

    renderRightBoard() {
        const div = document.createElement('div');
        div.classList.add('right-board');
        let innerHtml = '';
        if (this.param.globalSearch) {
            innerHtml += '<input id="global-search" placeholder="全局关键字查询"/>';
        }
        if (this.param.manageColumns) {
            innerHtml += '<button class="column-management">列管理</button><button class="column-reset">重置</button>';
        }
        if (this.param.export) {
            innerHtml += '<button id="export-btn">导出</button>';
        }
        div.innerHTML = innerHtml;
        this.wdtb.parentNode.insertBefore(div, this.wdtb);
        this.param.globalSearch && this.attachGlobalSearchEvent(div);
        this.param.manageColumns && this.attachColumnManagementEvents(div);
        this.param.export && this.attachExportEvent(div);
    }

    renderBody(keywords) {
        this.wdtb.querySelector('tbody') && (this.wdtb.querySelector('tbody').remove());
        const tbody = document.createElement('tbody');
        const columns = this.metadata.processingColumns;
        this.metadata.currentData.forEach(tr => {
            const row = document.createElement('tr');
            row.dataset.rowData = JSON.stringify(tr);
            columns.forEach(col => {
                const td = document.createElement('td');
                //allow user to customize td with function
                if (col.tdRender) {
                    td.innerHTML = col.tdRender(tr[col.cdata]);
                }
                //allow user to customize td with template
                else if (col.template) {
                    td.innerHTML = col.template;
                }
                //search highlighting
                else if (!col.type) {
                    let tpl_txt = tr[col.cdata] === undefined ? '' : tr[col.cdata] + '';
                    if (col.filter) {
                        tpl_txt = col.filter(tpl_txt);
                    }
                    keywords && keywords.forEach(keyword => {
                        if (tpl_txt.includes(keyword)) {
                            let yellowstr = `<span class="yellowed">${keyword}</span>`;
                            tpl_txt = tpl_txt.replace(keyword, yellowstr);
                        }
                    });
                    td.innerHTML = tpl_txt;
                }
                else if (col.type === 'a') {
                    let rawUrl = col.url.split('@@');
                    let href = "";
                    for (let [index, value] of col.params.entries()) {
                        href += rawUrl[index];
                        href += tr[value];
                    }
                    href += rawUrl.pop();
                    const tpl_a = `<a href="${href}">${col.cdata ? tr[col.cdata] : col.cname}</a>`;
                    td.innerHTML = tpl_a;
                }
                else if (col.type === 'btns') {
                    col.handlers.forEach(handler=> {
                        const btn = document.createElement('button');
                        btn.innerText = handler.btnText;
                        btn.addEventListener('click', handler.handler);
                        td.appendChild(btn);
                    })
                }
                else if (col.type === 'management') {
                    this.param.management = true;
                    td.classList.add('row-management');
                    td.innerHTML = '<button class="row-view">查看</button><button class="row-edit">编辑</button><button class="row-delete">删除</button>';
                }
                if (col.style === 'fakeA') {
                    td.classList.add('fake-a');
                }
                else if (col.style === 'hide') {
                    td.classList.add('hide');
                }
                if (col.action) {
                    td.addEventListener(col.action, (function () {
                        return function () {
                            col.trigger(tr, col.cname);
                        }
                    })());
                }
                col.adjust && col.adjust(td);
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
        this.wdtb.appendChild(tbody);
    }

    renderPages() {
        const {param: params, metadata} = this;
        const pagination = document.createElement('ul');
        pagination.classList.add('pagination');
        const pageTotal = metadata.pageTotal = Math.ceil(metadata.processingData.length / params.pageCount);
        const pageFirst = metadata.currentPage - 5 < 1 ? 1 : metadata.currentPage - 5;
        const pageLast = pageFirst + 10 > pageTotal ? pageTotal : pageFirst + 10;
        this.wdtb.parentNode.querySelector('ul.pagination') && this.wdtb.parentNode.querySelector('ul.pagination').remove();
        const frag = document.createDocumentFragment();
        for (let i = pageFirst; i <= pageLast; i++) {
            const span = document.createElement('span');
            span.innerText = i;
            if (i == metadata.currentPage) {
                span.classList.add('current-page');
            }
            frag.appendChild(span);
        }
        if (metadata.currentPage > 1) {
            const span = document.createElement('span');
            span.innerHTML = '&laquo;';
            span.classList.add('page-prev');
            frag.insertBefore(span, frag.childNodes[0]);
        }
        if (metadata.currentPage < pageTotal) {
            const span = document.createElement('span');
            span.innerHTML = '&raquo;';
            span.classList.add('page-next');
            frag.appendChild(span);
            // frag.append('<span class="page-next">&raquo;</span>'); 不会报错但append不了string转化成的元素 而是原string
        }
        pagination.appendChild(frag);
        this.wdtb.parentNode.append(pagination);
        this.renderPageInfo();
        this.delegatePagesEvents(pagination);
    }

    renderPageInfo() {
        const metadata = this.metadata;
        const pageInfo = this.wdtb.parentNode.querySelector('.page-info');
        if (!pageInfo) {
            const div = document.createElement('div');
            div.classList.add('page-info');
            div.innerHTML = `<span>当前第</span><input type="text" class="page-info-current" value="${metadata.currentPage}"/>
                <span>页 &nbsp 共</span><span class="page-info-pages">${metadata.pageTotal}</span>
                <span>页 &nbsp 共</span><span class="page-info-items">${metadata.processingData.length}</span><span>条</span>
                <div class="page-info-error hide">请输入有效页码</div>`;
            this.wdtb.parentNode.append(div);
            this.attachPagingInfoEvents();
        }
        else {
            pageInfo.querySelector('.page-info-current').value = metadata.currentPage;
            pageInfo.querySelector('.page-info-pages').innerText = metadata.pageTotal;
            pageInfo.querySelector('.page-info-items').innerText = metadata.processingData.length;
            pageInfo.querySelector('.page-info-error').classList.add('hide');
        }
    }

    bindDelegates() {
        this.delegateTableheadEvents();
        this.param.management && this.delegateTablebodyEvents();
    }

    delegateTableheadEvents() {
        const {param, metadata, that = this} = this;
        this.wdtb.addEventListener('click', function (evt) {
            const cList = evt.target.classList;
            if (cList.contains('arrows') && !cList.contains('invisible')) {
                const colTxt = evt.target.parentNode.parentNode.innerText;
                const sortParam = param.columns.find(item => item.cname == colTxt);
                if (cList.contains('tangle-up')) {
                    // _.sortBy with attr name
                    metadata.processingData = sortBy(metadata.processingData, sortParam.cdata);
                } else {
                    metadata.processingData = sortBy(metadata.processingData, sortParam.cdata).reverse();
                }
                metadata.currentPage = 1;
                that.refresh();
                cList.toggle('invisible');
            }

        }, false);
        this.wdtb.addEventListener('dblclick', (evt) => {
            if (evt.target.tagName == 'TH') {
                const inputs = Array.from(this.wdtb.querySelectorAll('thead input')).filter((el) => el.classList.contains('hide'));
                if (inputs.length) {
                    this.metadata.processingColumns.forEach(el => el.style = '');
                    this.renderHead();
                    this.renderBody();
                    document.querySelectorAll('thead input').forEach(el => el.classList.remove('hide'));
                } else {
                    for (let [index, value] of this.metadata.processingColumns.entries()) {
                        let checked = this.wdtb.querySelectorAll('thead input')[index].checked;
                        if (checked) {
                            value.style = null;
                        }
                        else {
                            value.style = 'hide';
                        }
                    }
                    this.renderHead();
                    this.renderBody();
                }
            }
        }, false);
    }

    delegateTablebodyEvents() {
        const that = this;
        this.wdtb.addEventListener('click', function (evt) {
            const cList = evt.target.classList;
            if (cList.contains('row-view')) {
                this.querySelector('#detail-modal') && this.querySelector('#detail-modal').remove();
                const data = JSON.parse(evt.target.parentNode.parentNode.dataset.rowData);
                const div = document.createElement('div');
                div.id = 'detail-modal';
                const tpl_div = '查看<div class="modal-content"></div><div class="bottom-row"><button class="modal-close">关闭</button></div>';
                const frag = document.createDocumentFragment();
                that.metadata.processingColumns.forEach((item)=> {
                    if (!item.type) {
                        const subDiv = document.createElement('div');
                        subDiv.innerHTML = `<span>${item.cname}</span><input value="${data[item.cdata]}" readonly/>`;
                        frag.appendChild(subDiv);
                    }
                });
                div.innerHTML = tpl_div;
                div.querySelector('.modal-content').appendChild(frag);
                that.wdtb.appendChild(div);
            }
            else if (cList.contains('row-edit')) {
                this.querySelector('#detail-modal') && this.querySelector('#detail-modal').remove();
                const tr = evt.target.parentNode.parentNode;
                tr.id = 'editting';
                const data = JSON.parse(tr.dataset.rowData);
                const div = document.createElement('div');
                div.id = 'detail-modal';
                const tpl_div = '编辑<div class="modal-content"></div><div class="bottom-row"><button class="modal-edit">确定</button><button class="modal-close">关闭</button></div>';
                const frag = document.createDocumentFragment();
                const tds = tr.querySelectorAll('td');
                const changedTd = Array.from(tds).filter((td) => td.hasAttribute('data-index'));
                that.metadata.processingColumns.forEach((item, index)=> {
                    if (!item.type) {
                        const subDiv = document.createElement('div');
                        subDiv.innerHTML = `<span>${item.cname}</span><input index="${index}" value="${changedTd[index] ? changedTd[index].innerHTML : data[item.cdata]}"/>`;
                        frag.appendChild(subDiv);
                        tds[index].dataset.index = index;
                    }
                });
                div.innerHTML = tpl_div;
                div.querySelector('.modal-content').appendChild(frag);
                that.wdtb.appendChild(div);
            }
            else if (cList.contains('row-delete')) {
                const tr = evt.target.parentNode.parentNode;
                const data = JSON.parse(tr.dataset.rowData);
                that.param.handlerDelete && that.param.handlerDelete(data);
                tr.remove();
                document.getElementById('detail-modal') && document.getElementById('detail-modal').remove();
            }
            else if (cList.contains('modal-edit')) {
                const row = this.querySelector('#editting');
                const modal = evt.target.parentNode.parentNode;
                const inputs = modal.querySelectorAll('input');
                const editedData = [];
                Array.from(row.childNodes, (td)=> {
                    if (td.dataset.index) {
                        td.innerHTML = inputs[td.dataset.index].value;
                        editedData.push(inputs[td.dataset.index].value);
                    }
                });
                that.param.handlerEdit && that.param.handlerEdit(editedData);
                modal.remove();
                row.removeAttribute('id');
            }
            else if (cList.contains('modal-close')) {
                evt.target.parentNode.parentNode.remove();
            }
        });
    }

    delegatePagesEvents(element) {
        const {metadata, that = this} = this;
        element.addEventListener('click', (evt) => {
            const target = evt.target;
            if (target.tagName.toLocaleUpperCase() == 'SPAN') {
                if (target.classList.contains('current-page')) {
                    return;
                } else if (target.classList.contains('page-prev')) {
                    metadata.currentPage = metadata.currentPage > 1 ? metadata.currentPage - 1 : 1;
                } else if (target.classList.contains('page-next')) {
                    metadata.currentPage = metadata.currentPage < metadata.pageTotal ? metadata.currentPage + 1 : metadata.pageTotal;
                } else {
                    metadata.currentPage = Number.parseInt(target.innerText);
                }
                that.refresh();
            }
        });
    }

    attachPageSizeEvent(el) {
        const {param, metadata} = this;
        el.addEventListener('change', (evt) => {
            param.pageCount = evt.target.value;
            metadata.pageTotal = Math.ceil(metadata.processingData.length / param.pageCount);
            metadata.currentPage = metadata.currentPage > metadata.pageTotal ? metadata.pageTotal : metadata.currentPage;
            this.refresh();
        });
    }

    attachPagingInfoEvents() {
        const iptCur = document.querySelector('.page-info-current');
        document.querySelector('.page-info-current').addEventListener('keydown', (evt) => {
            if (evt.keyCode == 13) {
                if (iptCur.value >= 1 && iptCur.value <= this.metadata.pageTotal) {
                    this.metadata.currentPage = iptCur.value;
                    this.refresh();
                } else {
                    iptCur.value = this.metadata.currentPage;
                    document.querySelector('.page-info-error').classList.remove('hide');
                }
            }
        });
    }

    attachGlobalSearchEvent(el) {
        el.querySelector('input').addEventListener('keyup', (evt) => {
            var keyword = evt.target.value;
            if (event.keyCode == 13) {
                if (keyword === '') {
                    this.resetData();
                    this.refresh();
                }
                else {
                    this.queryAll(keyword);
                }
            }
            else if (event.keyCode == 8) {
                if (keyword === '') {
                    this.resetData();
                    this.refresh();
                }
            }
        });
    }

    attachColumnManagementEvents(el) {
        const that = this;
        el.querySelector('button.column-management').addEventListener('click', function () {
            if (this.innerText == '列管理') {
                this.previousElementSibling.value = '';
                that.queryAll('');
                that.wdtb.querySelectorAll('thead input').forEach((el) => el.classList.remove('hide'));
                this.innerText = '确定';
            }
            else if (this.innerText == '确定') {
                for (let [index, value] of that.metadata.processingColumns.entries()) {
                    let checked = document.querySelectorAll('thead input')[index].checked;
                    if (checked) {
                        value.style = null;
                    }
                    else {
                        value.style = 'hide';
                    }
                }
                this.innerText = '列管理';
                that.renderHead();
                that.renderBody();
            }
        });
        el.querySelector('button.column-reset').addEventListener('click', function () {
            this.previousSibling.innerText = '列管理';
            that.resetColumns();
        });
    }

    // dependencies: bolb FileSaver.js
    // inefficient, consider twice before using this function
    attachExportEvent() {
        const {metadata: {processingColumns: columns, processingData: data}} = this;
        document.querySelector('#export-btn').addEventListener('click', () => {
            const exportedData = [];
            data.forEach(row => {
                let arr = [];
                for (let [index, value] of columns.entries()) {
                    let str = row[value.cdata] + '';
                    str && str.includes(',') && (str = str.replace(',', '，'));
                    arr.push(str);
                    if (index == columns.length - 1) {
                        exportedData.push(arr + '\n')
                    }
                }
            });
            exportedData.unshift((columns.map(row => row.cname)) + '\n');
            const blob = new Blob(exportedData, {type: 'text/plain;charset=utf-8'});
            saver.saveAs(blob, "download.csv");
        });
    }

    resetSortingArrows() {
        this.wdtb.querySelectorAll('thead .arrows.invisible').forEach((el)=> {
                el.classList.toggle('invisible');
            }
        );
    }

    resetColumns() {
        this.metadata.processingColumns = deepClone(this.param.columns);
        this.renderHead();
        this.renderBody();
    }

    query(queryParams) {
        let {metadata, yellowed = new Set()} = this;
        this.resetData();
        queryParams = sortBy(queryParams, 'predicate');
        queryParams.forEach(queryParam => {
            yellowed.add(queryParam.arg1);
            switch (queryParam.predicate) {
                case "eq":
                    metadata.processingData = metadata.processingData.filter(item => {
                        return item[queryParam.queryCol] == queryParam.arg1;
                    });
                    break;
                case "gt":
                    metadata.processingData = metadata.processingData.filter(item => item[queryParam.queryCol] >= queryParam.arg1);
                    break;
                case "lt":
                    metadata.processingData = metadata.processingData.filter(item => item[queryParam.queryCol] <= queryParam.arg1);
                    break;
                case "rg":
                    metadata.processingData = metadata.processingData.filter(item => item[queryParam.queryCol] >= queryParam.arg1 && item[queryParam.queryCol] <= queryParam.arg2);
                    break;
                case "zkw":
                    metadata.processingData = metadata.processingData.filter(item => {
                        return item[queryParam.queryCol].includes(queryParam.arg1);
                    });
                    break;
            }
        });
        this.refresh(yellowed);
    }

    queryAll(keyword) {
        this.resetData();
        this.metadata.processingData = this.metadata.processingData.filter(item => Object.values(item).join('Æता').includes(keyword));
        this.refresh([keyword]);
    }

    refresh(keywords) {
        this.getCurrentData();
        this.resetSortingArrows();
        this.renderBody(keywords);
        this.param.pagination && this.renderPages();
    }

    destroy() {
        this.param.el.remove();
    }
}