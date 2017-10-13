(function ($) {$(function () {
    'use strict';
    var user = '123',
        userStatus = 'moder';
    function isObject(variable) {
        return (/^\{.*\}$/.test(JSON.stringify(variable)));
    }
    
    // Родительский класс
    function Container(myTag, myChildren, myClass, myAttributes, myOptions) {
        this.tag = myTag;
        this.elem = document.createElement((myTag) ? myTag : 'div');
        if (myChildren instanceof Array) {
            this.cChildren = myChildren;
        } else if (myChildren) {
            throw new Error("Во втором аргументе Container (myChildren) должен быть массив.")
        } else {
            this.cChildren = [];
        }
        this.cClassName = myClass;
        if (isObject(myAttributes)) {
            this.cAttributes = myAttributes;
        } else if (myAttributes) {
            throw new Error("В четвёртом аргументе Container (myAttributes) должен быть объект.")
        } else {
            this.cAttributes = {};
        }
        if (isObject(myOptions)) {
            this.cOptions = myOptions;
        } else if (myOptions) {
            throw new Error("В пятом аргументе Container (myOptions) должен быть объект.")
        } else {
            this.cOptions = {};
        }
    }
    Container.prototype.render = function () {
        var that = this;
        if (this.elem) {
            this.elem = document.createElement((this.tag) ? this.tag : 'div');
            this.cChildren.forEach(function (child) {
                if (child instanceof Container) {
                    that.elem.appendChild(child.render());
                } else if (typeof child === 'object') {
                    that.elem.appendChild(child);
                } else if (typeof child === 'string') {
                    that.elem.innerHTML += child;
                } else {
                    throw new Error("Неправильный тип потомка " + child);
                }
            });
            if (this.cClassName) {
                this.elem.className = this.cClassName;
            }
            for (var key in this.cAttributes) {
                this.elem.setAttribute(key, this.cAttributes[key]);
            }
            for (var key in this.cOptions) {
                this.elem[key] = this.cOptions[key];
            }
            return this.elem;
        }
        return false;
    };
    Container.prototype.remove = function () {
        if (this.elem) {
            if (this.elem.parentNode) {
                this.elem.parentNode.removeChild(this.elem);
            }
            this.elem = null;
        }
    };
    
    // Операции с корзиной
    function Basket(goods) {
        Container.call(this, 'div', [], false, {id: 'basket'});
        var that = this;
        this.countGoods = 0;
        this.amount = 0;
        this.basketItems = $('<div/>', {
            id: 'basket_items'
        });
        this.basketData = $('<div/>', {
            id: 'basket_data'
        });
        this.goods = [];
        if (goods) {
            goods.forEach(function(good) {
                that.goods.push(new Good(good.name, good.price, good.id_product, good.amount));
            });
        }
        this.cChildren = [this.basketItems[0], this.basketData[0]];
    }
    Basket.prototype = Object.create(Container.prototype);
    Basket.prototype.constructor = Basket;
    Basket.prototype.operate = function (productNum, operation) {
        var amount = this.goods.find(function(good){
            return good.id_product === +productNum;
        }).amount,
            that = this;
        switch (operation) {
            case 'add':
                amount += 1;
                break;
            case 'subtract':
                amount -= 1;
                break;
            case 'delete':
                amount = 0;
                break;
        }
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: "basket/add.json?id_product=" + productNum + "&quantity=" + amount + "&rnd" + Math.random(),
            success: function(data) {
                if (+data.result === 1) {
                    that.goods.find(function(good){
                        return good.id_product === +productNum;
                    }).amount = amount;
                    $('[data-num="' + productNum + '"] .amount').text(' ' + amount + ' ');
                    var minus;
                    if (minus = $('[data-num="' + productNum + '"] .layOut')[0]) {
                        if (amount <= 0) {
                            minus.disabled = true;
                        } else {
                            minus.disabled = false;
                        }
                    }
                    that.refresh();
                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr.status);
                console.log(thrownError);
            }
        });
    }
    Basket.prototype.refresh = function () {
        var that = this;
        this.amount = 0;
        this.basketItems.empty();
        this.goods.forEach(function(good) {
            that.amount += good.price * good.amount;
            if (good.amount > 0) {
                that.basketItems.append($('<p/>').html('<b>' + good.amount + '</b> ' + good.name + ' -- ' + good.price * good.amount + ' руб.<input data-numx="' + good.id_product + '" type="button" class="delete" value="x">'));
            }
        });
        $('#' + this.cAttributes.id).replaceWith(this.render());
        var basketData = $('#basket_data');
        basketData.empty();
        basketData.text('Товаров в корзине на общую сумму - ' + this.amount + ' рублей');
    }
    
    function Good(name, price, id_product, amount) {
        this.name = name;
        this.price = +price;
        this.id_product = id_product;
        this.amount = (amount) ? amount : 0;
    }
    
    var basket;
    $.ajax({
        type: 'GET',
        dataType: 'json',
        url: "basket/get.json?id_user=" + user + "&rnd" + Math.random(),
        success: function(data) {
            basket = new Basket(data.basket);
            basket.refresh();
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: "basket/goods.json?page=test&rnd" + Math.random(),
                success: function(data) {
                    data.forEach(function (product) {
                        var thisamount = 0,
                            isIn = basket.goods.some(function(good) {
                                if (good.id_product === product.id_product) {
                                    thisamount = good.amount;
                                    return true;
                                }
                                return false;
                            });
                        if (!isIn) {
                            basket.goods.push(new Good(product.name, product.price, product.id_product));
                        }
                        var writeGood = $('<div/>', {
                            class: 'good'
                        });
                        writeGood.attr('data-num', product.id_product);
                        writeGood.append($('<p/>').text(product.name));
                        writeGood.append($('<p/>').append('Цена ', $('<span/>', {class: 'basket_data'}).text(product.price), ' руб.'));
                        if (thisamount === 0) {
                            writeGood.append($('<input/>', {type: 'button', class: 'layOut', value: '-', disabled: 'disabled'}));
                        } else {
                            writeGood.append($('<input/>', {type: 'button', class: 'layOut', value: '-'}));
                        }
                        writeGood.append($('<span/>', {class: 'amount'}).text(' ' + thisamount + ' '));
                        writeGood.append($('<input/>', {type: 'button', class: 'put', value: '+'}));
                        $('.goods').append(writeGood);
                    });
                    $('.goods').on('click', '.layOut', function() {
                        basket.operate($(this).parent().attr('data-num'), 'subtract');
                    });
                    $('.goods').on('click', '.put', function() {
                        basket.operate($(this).parent().attr('data-num'), 'add');
                    });
                    $('body').on('click', '.delete', function() {
                        basket.operate($(this).attr('data-numx'), 'delete');
                    });
                }
            });
        },
        error: function (xhr, ajaxOptions, thrownError) {
            console.log(xhr.status);
            console.log(thrownError);
        }
    });
    
    // Класс отзывов
    function Review(text, user, status) {
        Container.call(this, 'div', [], 'review', {"data-user": user});
        this.status = (status) ? status : 'new';
        this.text = text;
        this.user = user;
    }
    Review.prototype = Object.create(Container.prototype);
    Review.prototype.constructor = Review;
    Review.prototype.refresh = function (reviews) {
        if (this.status === 'deleted') {
            this.elem.remove();
        } else {
            this.cChildren = [];
            this.cChildren.push($('<b/>').text('Отзыв пользователя ' + this.user)[0]);
            this.cChildren.push($('<p/>').text(this.text)[0]);
            if (this.status === 'new' && userStatus === 'moder') {
                this.cChildren.push($('<input/>', {type: 'button', value: 'Одобрить', class: 'revApprove'})[0]);
            }
            if ((this.status === 'new' && userStatus === 'moder') || this.user === user) {
                this.cChildren.push($('<input/>', {type: 'button', value: 'Удалить', class: 'revDelete'})[0]);
            }
            if( $('[data-user="' + this.user + '"]').length > 0) {
                this.elem.replaceWith(this.render());
            } else {
                
                console.log('На рендер');
                console.log(this);
                console.log(reviews);
                console.log(this.render());
                
                reviews.append(this.render());
            }
        }
    }
    
    // Класс модуля отзывов
    function ReviewSet() {
        Container.call(this, 'div', [], 'reviewSet');
    }
    ReviewSet.prototype = Object.create(Container.prototype);
    ReviewSet.prototype.constructor = Review;
    ReviewSet.prototype.write = function () {
        this.cChildren = [];
        var reviews = $('<div/>', {class: 'reviews'})
        this.cChildren.push(reviews[0]);
        var iHaveReview = false;
        this.reviews.forEach(function(review) {
            if (review.user === user) {
                iHaveReview = true;
            }
            review.refresh(reviews);
        });
        if (!iHaveReview) {
            this.cChildren.push($('<form/>', {class: 'sendMess'}).html('<textarea name="newMess"></textarea><br><button type="submit">Отправить</button>')[0]);
        }
        return this.render();
    };
    ReviewSet.prototype.refresh = function () {
        var that = this;
        if (!this.reviews) {
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: "review/list.json?rnd" + Math.random(),
                success: function(data) {
                    if (+data.result === 1) {
                        that.reviews = [];
                        data.comments.forEach(function(comment) {
                            var newRev = new Review(comment.text, comment.id_user, comment.status);
                            that.reviews.push(newRev);
                        });
                        if( $('.reviewSet').length > 0) {
                            that.elem.replaceWith(that.write());
                        } else {
                            $('body').append(that.write());
                        }
                        $('#showRev').remove();
                    }
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    console.log(xhr.status);
                    console.log(thrownError);
                }
            });
        } else {
            this.write();
        }
    };
    
    // Обработчики отзывов
    var reviewSet;
    $('#showRev').on('click', function(){
        reviewSet = new ReviewSet();
        reviewSet.refresh();
    });
    $('body').on('submit', '.sendMess', function(e){
        e.preventDefault();
        var that = $(this);
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: encodeURI("review/add.json?id_user=" + user + "&text=" + that.find("textarea").val() + "&rnd" + Math.random()),
            success: function(data) {
                if (+data.result === 1) {
                    reviewSet.reviews.push(new Review(that.find("textarea").val(), user));
                    reviewSet.refresh();
                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr.status);
                console.log(thrownError);
            }
        });
    });
    $('body').on('click', '.revApprove', function() {
        var revUser = $(this).parent().attr('data-user');
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: encodeURI("review/submit.json?id_user=" + revUser + "&rnd" + Math.random()),
            success: function(data) {
                if (+data.result === 1) {
                    reviewSet.reviews.find(function(review){
                        return review.user === revUser;
                    }).status = 'approved';
                    reviewSet.refresh();
                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr.status);
                console.log(thrownError);
            }
        });
    });
    $('body').on('click', '.revDelete', function() {
        var revUser = $(this).parent().attr('data-user');
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: encodeURI("review/delete.json?id_user=" + revUser + "&rnd" + Math.random()),
            success: function(data) {
                if (+data.result === 1) {
                    reviewSet.reviews.find(function(review){
                        return review.user === revUser;
                    }).status = 'deleted';
                    reviewSet.refresh();
                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr.status);
                console.log(thrownError);
            }
        });
    });
    
});})(jQuery)