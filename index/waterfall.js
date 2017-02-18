/**
 * Created by LiYonglei on 2017/2/18.
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
    this.itemWidth = option.itemWidth;
    if(this.itemWidth){
        if((this.itemWidth+"").indexOf("%")!=-1){
            throw new Error("the itemWidth does not support the percentage assignment");
        }
        if(isNaN(parseFloat(this.itemWidth))){
            throw new Error("the itemWidth has a Incorrect format");
        }
        /*如果传入的itemWidth是数值,那么转化为像素*/
        if(!isNaN(this.itemWidth)){
            this.itemWidth+="px";
        }
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
    this.calculationColumn();
    this.generateColumn();
    this.initGenerateItem();
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
        var resize=[].slice.call(container.children,1).some(function(col){
                return col.offsetLeft===container.children[0].offsetLeft;
            })||(container.clientWidth-[].reduce.call(container.children,function(totalWidth,current){
                return totalWidth+current.clientWidth;
            },0)>=parseFloat(_this.columnWidth));
        if(resize){
            _this.calculationColumn();
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
        }
    });
}
/*
 * 滚动加载瀑布流元素
 * */
Waterfall.prototype.scrollGenerateItem=function(){
    var _this=this,scrollContainer=this.scrollContainer,isALL=false;
    (scrollContainer === document.documentElement?window:scrollContainer).addEventListener("scroll",function(){
        if(isALL){
            return;
        }
        var  cols=Array.prototype.slice.call(_this.container.children);
        var currentPushCols=cols.filter(function(col){
            return col.offsetTop + col.clientHeight < (scrollContainer.scrollTop||document.body.scrollTop) + (scrollContainer.innerHeight || document.documentElement.clientHeight)+100;
        });
        currentPushCols.every(function(col){
            var item=_this.generateItemFn(this);
            if(!item){
                isALL=true;
                return false;
            }
            item.classList.add("waterfall-item");
            _this.waterfallItems.push(item);
            col.appendChild(item);
            return true;
        });
        _this.currentItem=[].filter.call(_this.waterfallItems,function(item){
            return item.offsetTop>(scrollContainer.scrollTop||document.body.scrollTop);
        })[0];
    });
}
/*
 * 生成每个瀑布流元素
 * */
Waterfall.prototype.initGenerateItem=function(){
    var _this=this,
        scrollContainer=this.scrollContainer,
        cols=Array.prototype.slice.call(this.container.children),isALL=false;
    this.waterfallItems=[];
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
        var item=_this.generateItemFn(this);
        if(!item){
            isALL=true;
            return false;
        }
        item.classList.add("waterfall-item");
        _this.waterfallItems.push(item);
        currentPushRow.appendChild(item);
        if(!isALL){
            initGenerateWaterfallItem();
        }
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
    var columnWidthToolRow=document.createElement("div"),columnWidhtToolItem=document.createElement("div");
    columnWidthToolRow.classList.add("waterfall-column");
    columnWidhtToolItem.classList.add("waterfall-item");
    if(this.itemWidth){
        columnWidhtToolItem.style.width=this.itemWidth;
    }
    columnWidthToolRow.appendChild(columnWidhtToolItem);
    this.container.appendChild(columnWidthToolRow);
    this.columnCount=Math.floor(this.container.getBoundingClientRect().width/columnWidthToolRow.getBoundingClientRect().width);
    this.columnWidth=columnWidthToolRow.getBoundingClientRect().width+"px";
    this.container.removeChild(columnWidthToolRow);
}