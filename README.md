# Network Doodler

The original tool was made by Evan Wallace, called `Finite State Machine Designer`.
I have used this clever little tool for many years to quickly draw my thoughts in the context of design thinking, mind mapping, system design, dependency graph planning, and anything with graph theory.
I think graph theory style thinking is widely applicable to most types of problem solving and want to make this tool a bit more functional for my own uses, and perhaps the layperson.
So I'm calling Network Doodler because that's what it is to me, and what I think it could be for other people.

See http://madebyevan.com/fsm/ for Evan's original implementation

## Enhanced Functionality
- Expand the canvas to the entire browser window and shift info and menus to the bottom right.
- Make the colors nice, feeling like moving around post-it notes on a large piece of engineering paper.
- Fix the broken png download functionality (broken as of this writing, 2025-9-20).
- Add functionality to download LaTeX, SVG
- Add a "Clear Canvas" functionality
- Add a "JSON download" function, specific for saving your work on this app
- Add an "Upload JSON" function, so you can upload and resume saved work 


### To host locally:
```
cd fsm  # root directory
python3 build_fsm.py
cd www
python3 -m http.server 8000
```
then visit http://localhost:8000 in your browser

