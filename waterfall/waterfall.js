/**
 * Created by LiYonglei on 2017/2/18.
 * 一个瀑布流插件:
 * 1.支持任意设置瀑布流元素的任意样式
 * 2.支持屏幕大小缩放重新计算
 * 3.支持异步添加瀑布流元素
 * params:
 *      container: string or dom;指定瀑布流元素的容器
 *      option:{
 *          scrollContainer: string or dom;指定瀑布流容器的滚动祖先元素;default:document.documentElement,
 *          generateItemFn:function(resolve,reject);添加瀑布流元素的函数
 *      }
 * ******************************
 * generateItemFn的说明:
 *      注入两个参数:resolve,reject;
 *      resolve,reject是内置Promise实例的两个参数;resolve为解决,reject为拒绝;
 *      当要向瀑布流中添加元素item的时候请调用resolve(item);
 *      当终止瀑布流中添加元素的时候请调用reject(msg),msg是string类型的任意字符串,用来说明为什么终止添加元素
 * ******************************
 * 不支持ie浏览器...
 */
function Waterfall(container,option){
    if(this instanceof Window){
        return new Waterfall(container,option);
    }
    if(!container||(typeof container !=="string"&& !(container instanceof Element))){
        throw new Error("the container must be a String or be an Element");
    }
    if(!option||!(option instanceof Object)){
        throw new Error("the option must be an object");
    }
    this.generateItemFn=option.generateItemFn;
    if(typeof this.generateItemFn !== "function"){
        throw new Error("the generateItemFn must be a function");
    }
    if(typeof container === "string" ){
        container = document.querySelector(container);
    }
    this.container=container;
    this.scrollContainer=option.scrollContainer||document.documentElement;
    if(typeof option.scrollContainer === "string"){
        this.scrollContainer=document.querySelector(this.scrollContainer);
    }
    this.waterfallItems=[];
    this.calculationColumn().then(function(){
        this.generateColumn();
        this.initGenerateItem();
    }.bind(this));
    this.scrollGenerateItem();
    this.resize();
};
/*
 * 浏览器大小改变时候重新渲染
 * */
Waterfall.prototype.resize=function(){
    var _this=this,
        container=this.container,
        cols,
        waterfallItems=this.waterfallItems;
    window.addEventListener("resize",function(){
        var waterfallItemIdx=-1;
        /*
        * 当瀑布流中的列只要有一个跟第一列距离父元素的左边距离相同
        * 或者
        * 父元素的宽度比所有的列的宽度和加上一个列的宽度还要宽的时候就重新计算渲染布局
        * */
        var resize=[].slice.call(container.children,1).some(function(col){
                return col.offsetLeft===container.children[0].offsetLeft;
            })||(container.clientWidth-[].reduce.call(container.children,function(totalWidth,current){
                return totalWidth+current.clientWidth;
            },0)>=parseFloat(_this.columnWidth));
        if(resize){
            _this.calculationColumn().then(function(){
                _this.generateColumn();
                cols=Array.prototype.slice.call(_this.container.children);
                generateWaterfallItem();
                function generateWaterfallItem(){
                    if(++waterfallItemIdx>=waterfallItems.length){
                        return false;
                    }
                    cols.reduce(function(privous,current){
                        if(!privous){
                            return current;
                        }
                        return privous.clientHeight>current.clientHeight?current:privous;
                    }).appendChild(waterfallItems[waterfallItemIdx]);
                    generateWaterfallItem();
                };
                if(_this.currentItem){
                    _this.currentItem.scrollIntoView(true);
                }
            },function(msg){
                console.log(msg);
            })
        }
    });
}
/*
 * 滚动加载瀑布流元素
 * */
Waterfall.prototype.scrollGenerateItem=function(){
    var _this=this,
        cols,
        scrollContainer=this.scrollContainer,
        currentRow,
        promise,
        isShouldAdd=false;
    (scrollContainer === document.documentElement?window:scrollContainer).addEventListener("scroll",function(){
        _this.currentItem=[].filter.call(_this.waterfallItems,function(item){
            return item.offsetTop>(scrollContainer.scrollTop||document.body.scrollTop);
        })[0];
        if(promise&&!isShouldAdd){
            return;
        }else{
            isShouldAdd=false;
        }
        addWaterfall();
    });
    function addWaterfall(){
        cols=Array.prototype.slice.call(_this.container.children);
        currentRow=cols.reduce(function(privous,current){
            return privous.clientHeight>current.clientHeight?current:privous;
        });
        if(currentRow.offsetTop+currentRow.clientHeight>(scrollContainer.scrollTop||document.body.scrollTop) + (scrollContainer.innerHeight || document.documentElement.clientHeight)+100){
            isShouldAdd=true;
            return;
        };
        promise=new Promise(function(resolve, reject){
            _this.generateItemFn(resolve, reject);
        });
        promise.then(function(item){
            var waterfall=document.createElement("div");
            waterfall.classList.add("waterfall-item");
            waterfall.appendChild(item);
            _this.waterfallItems.push(waterfall);
            currentRow.appendChild(waterfall);
            addWaterfall();
        },function(msg){
            console.log(msg);
        });
    }
}
/*
 * 生成每个瀑布流元素
 * */
Waterfall.prototype.initGenerateItem=function(){
    var _this=this,
        scrollContainer=this.scrollContainer,
        cols=Array.prototype.slice.call(this.container.children),
        promise;
    initGenerateWaterfallItem();
    function initGenerateWaterfallItem(){
        if(!cols.filter(function(col){
                return col.offsetTop + col.clientHeight <(scrollContainer.innerHeight || document.documentElement.clientHeight);
            }).length){
            return;
        }
        var currentPushRow=cols.reduce(function(privous,current){
            return privous.clientHeight>current.clientHeight?current:privous;
        });
        promise=new Promise(function(resolve, reject){
            _this.initReject=reject;
            _this.generateItemFn(resolve, reject);
        });
        promise.then(function(item){
            var waterfall=document.createElement("div");
            waterfall.classList.add("waterfall-item");
            waterfall.appendChild(item);
            _this.waterfallItems.push(waterfall);
            currentPushRow.appendChild(waterfall);
            initGenerateWaterfallItem();
        },function(msg){
            console.log(msg);
        })
    };
}
/*
 * 生成列
 * */
Waterfall.prototype.generateColumn=function(){
    var i,children=this.container.children,cols=document.createDocumentFragment(),col;
    for(var i=children.length-1;i>=0;i--){
        this.container.removeChild(children[i]);
    }
    for(i=0;i<this.columnCount;i++){
        col=document.createElement("div");
        col.classList.add("waterfall-column");
        col.style.width=this.columnWidth;
        cols.appendChild(col);
    }
    this.container.appendChild(cols);
}
/*
 * 计算列数以及每列的宽度
 * */
Waterfall.prototype.calculationColumn=function(){
    var _this=this,promise;
    if(!_this.columnWidth){
        promise=new Promise(function(resolve, reject){
            _this.generateItemFn(resolve, reject);
        });
        promise.then(function(item){
            var columnWidthToolRow=document.createElement("div"),columnWidhtToolItem=document.createElement("div");
            _this.container.appendChild(columnWidthToolRow);
            columnWidthToolRow.classList.add("waterfall-column");
            columnWidhtToolItem.classList.add("waterfall-item");
            columnWidthToolRow.appendChild(columnWidhtToolItem);
            item.classList.add("waterfall-item");
            item.style.opacity=0;
            columnWidhtToolItem.appendChild(item);
            _this.columnCount=Math.floor(_this.container.getBoundingClientRect().width/columnWidthToolRow.getBoundingClientRect().width);
            _this.columnWidth=columnWidthToolRow.getBoundingClientRect().width+"px";
            _this.container.removeChild(columnWidthToolRow);
        },function(msg){
            console.log(msg);
        })
    }else{
        promise=new Promise(function(resolve, reject){
            _this.columnCount=Math.floor(_this.container.getBoundingClientRect().width/parseFloat(_this.columnWidth));
            resolve();
        });
    }
    return promise;
}