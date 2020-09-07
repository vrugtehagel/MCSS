# MCSS
The ultimate preprocessor for semantic and clean output CSS.

## What is MCSS and why?
Let's face it, CSS is a horrible language. It is almost impossible to write nice, readable CSS because of the way CSS is structured. Selector, declarations, selector, declarations, at-rule, selector, declarations.

The major issue here, is the format. A CSS file is just a really long list of properties and values with no structure whatsoever. SASS tries to improve on this by introducing nesting. A great idea! It provides a little more structure, but it still ends up being a long list of (possibly differently indented) list of properties and values.

A lot of the CSS we write already has some structure. We often use width, height, padding, margin, display, position, and properties like these. They are the core properties of most elements. But, in a CSS file, they are all seperate and unrelated properties. We can't do anything about that, that's just how it is, but a preprocessor could very well group these together to make the file more readable and maintainable.

At-rules. For any responsive design, we will use `@media` rules - specifically `max-width` ones. It would be nice to have your at-rules right with the properties you're changing, but in CSS, we're more-or-less forced to throw them all at the bottom of the file. This is horrible for readability, because now you don't know what values change where.

MCSS tries to solve a lot of these things. It tries to make it possible to write CSS in a less vertically oriented format, while still outputting high-quality, clean CSS like a real human wrote it.

## Installing MCSS
You can install MCSS using `npm` - simply run
```
npm install -g @vrugtehagel/mcss
```
and you're good to go! You can check if everything installed correctly by running `mcss version`. To compile a `.mcss` file to CSS, simply run
```
mcss filename.mcss
```
and it will output your gorgeous CSS to `filename.css`. Enjoy!

## Feature list
Enough time wasted selling MCSS. Let's get to the good stuff!
### Syntax
The first thing you should know, is that MCSS doesn't use `{` and `}`. CSS never really needed them, and they only contribute to the lengthy nature CSS has, so MCSS just got rid of them. For the rest, MCSS is almost identical to CSS in nature.

### Nesting
Of course, no good preprocessor without this

```
p
  text-indent: 5em;
  color: black;
  a
    color: inherit;
```
MCSS uses the indentation to decide what property belongs to what selector. The above would output to
```
p {
  text-indent: 5em;
  color: black;
}

p a { color: inherit; }
```
MCSS allows properties and selectors to be on the same line, and it assumes that they would belong to the same selector. For example,
```
p
  text-indent: 5em; color: black;
  a color: inherit;
```
still has the same output as the previous example.

### `if` statements
SASS has the `&` syntax for psuedoclasses and the like. MCSS uses a different syntax, more accurately representing what it does:
```
a
  color: blue;
  if(:visited)
    color: purple;
```
Which outputs to
```
a { color: blue; }
a:visited { color: purple; }
```
inside the `if()`, you're only allowed to filter the element with classes, an ID, attribute selector, or a pseudoclass. This syntax has some more benefits regarding transformations and transitions - more about those later.

### Shortening `margin` and `padding` forever
Sometimes, you want to set the `padding-left` and `padding-right` properties without touching the `padding-top` and `padding-bottom`. With MCSS, you can use a period `.` to tell MCSS that you don't actually want to set this side of `padding` or `margin`.
```
div
  margin: . auto;
  padding: 10px 20px .;
```
Outputs
```
div {
  margin-right: auto;
  margin-left: auto;
  padding-top: 10px;
  padding-right: 20px;
  padding-left: 20px;
}
```

### The `model` property
MCSS introduces a new property: `model`. It bundles all the properties related to the box model. The syntax is as follows:
```
model: [display | ]? [width] [height] [ | padding [ | margin [ | box-sizing]?]?]?;
```
So, here's a few examples:
```
section model: inline-block | 100% 500px | 50px | 0 auto . | border-box;
article model: 100vw 100vh | . | 50px 0;
```
will output
```
section {
  display: inline-block;
  width: 100%;
  height: 500px;
  padding: 50px;
  margin-top: 0;
  margin-right: auto;
  margin-left: auto;
  box-sizing: border-box;
}

article {
  width: 100vw;
  height: 100vh;
  margin: 50px 0;
}
```

### The `place` property
Similar to the `model`, property, `place` bundles some related CSS properties. However, the `place` property is not as straight-forward as the `model` property. The syntax is
```
place: [position]? | [place-vertical] | [place-horizontal];
```
where
```
place-vertical: [anchorParent] [anchorThis]? [offset]?;
place-horizontal: [anchorParent] [anchorThis]? [offset]?;
```
Essentially, you have control over the anchor point of the element you're placing, as well as the position relative to the parent. Let's do an example:
```
button
  place: top bottom 18px | left left 0;
```
This means that the bottom of the placed element is an `18px` distance from the parent's top edge, while the left side of the placed element has a distance of `0` relative to the left of its parent. The output results in
```
button {
  position: absolute;
  top: 18px;
  left: 0;
  transform: translateY(-100%);
}
```
If the `position` value is omitted, it will default to `absolute`. If you don't want to set the `position` property at all, don't fret! Like with `margin` and `padding`, you can give it a period `.` as value to ignore setting it.

`anchorThis` can also take percentage values; if you would like to anchor it to `20%` below the top of the placed element, you can simly use `place-vertical: top 20% 0;`. If `anchorThis` is omitted, it will default to the value of `anchorParent`.

If `offset` is omitted, it will default to `0`. Note that when setting `anchorThis` to a percentage value, setting `offset` is required. Otherwise, it will assume the value given is for `offset`, and it will assume `anchorThis` was omitted.

You may set `place-vertical` or `place-horizontal` directly. It also allows for a `position` property to be set, so valid syntax would be
```
place-vertical: absolute | top 40% 10em;
```
Lastly, there's some spice for you: centering elements has never been easier. You can now use the following syntax:
```
place-vertical: center [anchorThis]?;
place-horizontal: center [anchorThis]?;
```
Where if `anchorThis` is omitted, it will default to `center` as well, allowing for code like
```
button
  place: center | center right;
```
which would result in
```
button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-100%, -50%);
}
```
Lastly, very often you will want to simply set `place: top | left;` or something similar (only setting the `achorParent`): therefore, you can omit the `|` as to make your life a little easier. Thus, we might write
```
button
  place: top left;
```
to get
```
button {
  position: absolute;
  top: 0;
  left: 0;
}
```
### The `palette` property
The pallete property is a shorthand for `color` and `background-color`. The syntax is
```
palette: [color] on [background-color];
palette: [color] | [background-color];
palette: [color] [background-color];
```
So for example, we could do
```
button
  palette: white on rgb(20, 20, 40);
  if(:hover)
    palette: black white;
```
which will output
```
button {
  color: white;
  background-color: rgb(20, 20, 40);
}

button:hover {
  color: black;
  background-color: white;
}
```
### Setting declarations for `:root`
In MCSS, you can write declarations on the top-most level, and MCSS will interpret them as being for the `:root` element. Useful for setting global CSS variables, as well as things like `font-size`.
```
--text-color: rgba(0, 0, 0, 0.3);
font-size: 18px;
```
outputs
```
:root {
  --text-color: rgba(0, 0, 0, 0.3);
  font-size: 18px;
}
```

### Easy at-rules
You can set an at-rule inside a declaration by appending it to the value. For example:
```
font-size: 24px;
font-size: 18px @media (max-width: 1000px);
```
and this will compile to 
```
:root { font-size: 24px; }

@media (max-width: 1000px) {
  :root { font-size: 18px; }
}
```
You can use multiple at-rules by simply listing them out:
```
section
  display: flex;
  display: grid @media (min-width: 1000px) @supports (display: grid);
```
which yields
```
section { display: flex; }

@media (min-width: 1000px) {
  @supports (display: grid) {
    section { display: grid; }
  }
}
```
Since using `max-width` and `min-width` is so common, MCSS has a shorthand for it: instead of writing `@media (max-width: value)` you can write `@<value`, and similarly for `min-width`. Note that this is only a shorthand for setting the value inside a declaration.
```
font-size: 30px @>2000px;
font-size: 24px;
font-size: 18px @<1000px;
```
outputs
```
:root { font-size: 24px; }

@media (min-width: 2000px) {
  :root { font-size: 30px; }
}

@media (max-width: 1000px) {
  :root { font-size: 18px; }
}
```
### Easy transitions
MCSS allows you to define a transition for elements inside the declaration itself. It uses the following syntax:
```
property: value @ [transitionValue];
```
The whitespace after the `@` is mandatory, or it will be interpreted as an at-rule. For `transitionValue`, you can give it anything you can give the `transition` property except the `transition-property` value. MCSS is smart about this though; it will never overwrite the transition you already set, but rather append this one to the existing transition property (or create it if no `transition` property has been set). For example:
```
button
  transition: all .2s;
  background-color: grey @ .5s linear;
```
compiles to
```
button {
  transition: all .2s, background-color .5s linear;
  background-color: grey;
}
```
Here's where the `if()` syntax really shines; setting a transition on a property selected using `if()`, MCSS will find the transition property of the original element, and set the transition property using all the values previously set as well. That means you can do:
```
button
  transition: all .2;
  border-radius: 10px;
  background-color: grey @ .5s;
  if(:hover)
    background-color: darkgrey @ 1s;
    border-radius: 0 @ 0s;
    border-width: 5px;
```
results in
```
button {
  transition: all .2, background-color .5s;
  border-radius: 10px;
  background-color: grey;
}

button:hover {
  background-color: darkgrey;
  transition: all .2,
    background-color 1s,
    border-radius 0s;
  border-radius: 0;
  border-width: 5px;
}
```
This way, the transitions won't be reset unless you actually want them to. Want to use this functionality, but without setting the transition using the `@`-notation? No worries! MCSS has got your back.

### The `add-transition` property
You can use the `add-transition` property to, well, add transition properties if there already exists a `transition` property but you'd rather not touch it or you want to add to them in `if()` statements. That would work as follows:
```
button
  add-transition: color 1s 1s;
  transition: opacity .5s;
  if(:hover) add-transition: border-width .2s, border-radius .2s;
```
becomes
```
button { transition: opacity .5s, color 1s 1s; }

button:hover {
  transition: opacity .5s,
    color 1s 1s,
    border-width .2s,
    border-radius .2s;
  }
```

### The `add-transform` property
Like the `add-transition` property, MCSS allows you to add transforms to an already-existing transform. So, you can do this now:
```
svg
  transform: scale(2) @ .5s;
  if(:hover)
    add-transform: rotate(360deg);
```
and that would look like
```
svg {
  transform: scale(2);
  transition: transform .5s;
}

svg:hover { transform: rotate(360deg) scale(2); }
```
### Animations using `@keyframes`
There is a slight improvement on how you use `@keyframes` in MCSS. You now got the `via` keyword, that linearly interpolates between the last absolute value set before it and the first one after it. That means, you can do
```
@keyframes blinkOutInOut
  from opacity: 1;
  via opacity: 0;
  via opacity: 1;
  to opacity: 0;
```
outputting
```
@keyframes blinkOutInOut {
  from { opacity: 1; }
  33.333% { opacity: 0; }
  66.667% { opacity: 1; }
  to { opacity: 0; }
}
```
It will round floats to 3 decimals. You can also use `via` between any percentage values, for example:
```
@keyframes colorDance
  0%
    color: red;
    background-color: blue;
  10% color: green;
  via background-color: pink;
  via
    color: purple;
    background-color: tomato;
  40% color: blue;
  100%
    color: red;
    background-color: blue;
```
will become
```
@keyframes colorDance {
  0% {
    color: red;
    background-color: blue;
  }
  10% { color: green; }
  20% { background-color: pink; }
  30% {
    color: purple;
    background-color: tomato;
  }
  40% { color: blue; }
  100% {
    color: red;
    background-color: blue;
  }
}
```

### Pseudoelements
The syntax in CSS, but in SASS even more, always has been a bit odd when it comes to psuedoelements. For example, the `div::after` element would be a child of the `div`, so it would make sense for it to have that structure when nesting properties. Thus, in MCSS, you can do:
```
span.asterisk
  font-weight: bolder;
  ::before content: "*";
  ::after content: "*";
```
will result in
```
span.asterisk { font-weight: bolder; }
span.asterisk::before { content: "*"; }
span.asterisk::after { content: "*"; }
```

### Variables
MCSS doesn't have its own variables for the sake of keeping the CSS itself dynamic and easy to use. However, it slightly improves on CSS variables by eliminating the need for `var()`. You can now simply write the variable itself. For example:
```
--main-color: #FF9700;
--text-color: black;

body
  palette: --text-color on --main-color;
```
outputs
```
:root {
  --main-color: #FF9700;
  --text-color: black;
}

body {
  color: var(--text-color);
  background-color: var(--main-color);
}
```