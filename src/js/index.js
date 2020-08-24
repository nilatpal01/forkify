import Search from "./models/Search";
import Recipe from "./models/Recipe";
import List from "./models/List";
import Likes from "./models/Likes";
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import {
    elements,
    renderLoader,
    clearLoader
} from './views/base';

/*Global state of app
 *-search object
 *-Current recipe object
 *-shopping list object
 *-Liked recipes
 */
const state = {};

//SEARCH CONTROLLER

const controlSearch = async () => {
    //1.get inputfrom the view
    const query = searchView.getInput();

    if (query) {
        //2.new search object and add to state
        state.search = new Search(query);
        //3.prepare ui for the result
        searchView.clearInput();
        searchView.clearResult();
        renderLoader(elements.searchRes);
        try {
            //4.search for recipes
            await state.search.getResult();
            //5.render result on ui
            clearLoader();
            searchView.renderResults(state.search.result);
        } catch (err) {
            alert('something went wrong with the search...');
            clearLoader();
        }
    }
}

elements.searchform.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});
elements.searchResPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if (btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);
        searchView.clearResult();
        searchView.renderResults(state.search.result, goToPage);
        console.log(goToPage);
    }
})

//RECIPE CONTROLLER

const controlRecipe = async () => {
    //1.get id from the url

    const id = window.location.hash.replace('#', '');
    if (id) {

        //2.prepare ui for changes
        recipeView.clearRecipe();
        renderLoader(elements.recipe);
        if (state.search) searchView.highlightSelected(id);
        //3.create new recipe object
        state.recipe = new Recipe(id);

        try {
            //4.get recipe data and parse ingredients
            await state.recipe.getRecipe();
            state.recipe.parseIG();


            //5.calculate servings and time
            state.recipe.calcTime();
            state.recipe.calcServing();

            //6.render recipe
            clearLoader();
            recipeView.renderRecipe(state.recipe, state.likes.isLiked(id));

        } catch (err) {
            alert('Error Processing recipe');
        }

    }
}

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

//List controller

const controlList = () => {
    //CREATE A NEW LIST IF THERE IS NONE YET
    if (!state.list) state.list = new List();
    //ADD EACH INGREDIENT TO THE LIST and UI
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    });
}

//HANDLE DELETE AND UPDATE LIST ITEM EVENTS
elements.shopping.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    //handle delete
    if (e.target.matches('.shopping__delete, .shopping__delete *')) {
        //delete from state
        state.list.deleteItem(id);

        //delete from the ui
        listView.deleteItem(id);
        //update the count
    } else if (e.target.matches('.shopping__count-value')) {
        const val = parseFloat(e.target.value, 10);
        state.list.updateCount(id, val);
    }
});

//LIKE CONTROLLER

const controlLike = () => {
    if (!state.likes) state.likes = new Likes();
    const currentID = state.recipe.id;
    //user has NOT liked the recipe
    if (!state.likes.isLiked(currentID)) {
        //add like to the state
        const newLike = state.likes.addLike(
            currentID,
            state.recipe.title,
            state.recipe.author,
            state.recipe.img

        );
        //toggle the like button
        likesView.toggleLikeBtn(true);

        //add like to the UI
        likesView.renderLike(newLike);
        // console.log(state.likes);
    }
    //user has liked the recipe
    else {
        //remove like to the state
        state.likes.deleteLike(currentID);

        //toggle the like button
        likesView.toggleLikeBtn(false);

        //remove like to the UI
        likesView.deleteLike(currentID);

        //console.log(state.likes);

    }
    likesView.toggleLikeMenu(state.likes.getNumLikes());
};

//restore liked recipes on page load
window.addEventListener('load', () => {
    state.likes = new Likes();
    //restore likes
    state.likes.readStorage();
    //toggle like menu button
    likesView.toggleLikeMenu(state.likes.getNumLikes());
    //render the existings like
    state.likes.likes.forEach(like => likesView.renderLike(like));
});

//Handling recipe button clicks

elements.recipe.addEventListener('click', e => {

    if (e.target.matches('.btn-decrease, .btn-decrease *')) {
        //decrease button is clicked
        if (state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            recipeView.updateServingsIngredients(state.recipe);
        }
    } else if (e.target.matches('.btn-increase, .btn-increase *')) {
        //increase is clicked
        state.recipe.updateServings('inc');
        recipeView.updateServingsIngredients(state.recipe);
    } else if (e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        controlList();
    } else if (e.target.matches('.recipe__love, .recipe__love *')) {
        //Like controller
        controlLike();
    }
});