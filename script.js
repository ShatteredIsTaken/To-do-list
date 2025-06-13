// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const listSelector = document.getElementById('list-selector');
    const newListNameInput = document.getElementById('new-list-name');
    const addListBtn = document.getElementById('add-list-btn');
    const currentListTitle = document.getElementById('current-list-title');

    const newTaskTextInput = document.getElementById('new-task-text');
    const taskDueDateInput = document.getElementById('task-due-date');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const emptyListMessage = document.getElementById('empty-list-message');
    const filterButtons = document.querySelectorAll('.filter-btn');

    const completionMessage = document.getElementById('completion-message');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const myConfetti = confetti.create(confettiCanvas, { resize: true, useWorker: true });

    // --- State Variables ---
    let lists = []; // Stores all lists: [{ id, name, tasks: [] }]
    let activeListId = null; // ID of the currently selected list
    let activeFilter = 'all'; // Current task filter ('all', 'today', 'upcoming', 'completed')

    // --- Initialization ---
    function init() {
        loadState(); // Load lists and activeListId from local storage
        if (lists.length === 0) {
            // If no lists, create a default 'General' list
            addList('General');
        } else if (activeListId === null || !lists.find(l => l.id === activeListId)) {
            // If activeListId is invalid or not set, default to the first list
            activeListId = lists[0].id;
        }

        renderLists();
        renderTasks();

        // Initialize date picker
        flatpickr(taskDueDateInput, {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "M j, Y", // e.g., May 23, 2025
            minDate: "today",
            locale: {
                firstDayOfWeek: 1 // Start week on Monday
            }
        });
    }

    // --- Data Persistence ---
    function saveState() {
        localStorage.setItem('todoAppLists', JSON.stringify(lists));
        localStorage.setItem('todoAppActiveListId', activeListId);
    }

    function loadState() {
        const storedLists = localStorage.getItem('todoAppLists');
        const storedActiveListId = localStorage.getItem('todoAppActiveListId');

        if (storedLists) {
            lists = JSON.parse(storedLists);
        }
        if (storedActiveListId) {
            activeListId = parseInt(storedActiveListId); // Parse as int
        }
    }

    // --- List Management Functions ---
    function getActiveList() {
        return lists.find(list => list.id === activeListId);
    }

    function renderLists() {
        listSelector.innerHTML = '';
        const fragment = document.createDocumentFragment();

        lists.forEach(list => {
            const listItem = document.createElement('li');
            listItem.dataset.listId = list.id;
            listItem.innerHTML = `
                <span><i class="fas fa-folder"></i> ${list.name}</span>
                ${list.id !== 1 ? `<button class="delete-list-btn" title="Delete List"><i class="fas fa-trash"></i></button>` : ''}
            `;
            if (list.id === activeListId) {
                listItem.classList.add('active');
            }
            fragment.appendChild(listItem);
        });
        listSelector.appendChild(fragment);

        const activeList = getActiveList();
        currentListTitle.textContent = activeList ? activeList.name + ' Tasks' : 'No List Selected';
    }

    function addList(name) {
        const listName = name || newListNameInput.value.trim();
        if (listName) {
            const newList = {
                id: Date.now(), // Unique ID for the list
                name: listName,
                tasks: []
            };
            lists.push(newList);
            newListNameInput.value = '';
            activeListId = newList.id; // Automatically switch to the new list
            saveState();
            renderLists();
            renderTasks(); // Render tasks for the new active list
        }
    }

    function deleteList(listId) {
        // Prevent deleting the default 'General' list (assuming ID 1 for it)
        if (listId === 1 && lists.length > 1) {
            alert("The 'General' list cannot be deleted unless it's the only list remaining.");
            return;
        }

        if (confirm('Are you sure you want to delete this list and all its tasks?')) {
            lists = lists.filter(list => list.id !== listId);
            if (activeListId === listId) {
                // If the deleted list was active, switch to the first available list
                activeListId = lists.length > 0 ? lists[0].id : null;
                // If no lists left, create a default 'General' list
                if (lists.length === 0) {
                    addList('General');
                    return; // Exit to avoid double rendering
                }
            }
            saveState();
            renderLists();
            renderTasks();
        }
    }

    function switchList(listId) {
        if (activeListId !== listId) {
            activeListId = listId;
            saveState();
            renderLists();
            renderTasks();
            // Reset filter to 'all' when switching lists for fresh view
            setActiveFilter('all');
        }
    }

    // --- Task Management Functions ---
    function renderTasks() {
        const activeList = getActiveList();
        taskList.innerHTML = ''; // Clear current tasks

        if (!activeList || activeList.tasks.length === 0) {
            emptyListMessage.style.display = 'flex'; // Show empty message
            checkAllCompleted(); // Even if empty, check if confetti applies (e.g. if all tasks were deleted)
            return;
        } else {
            emptyListMessage.style.display = 'none'; // Hide empty message
        }

        const filteredTasks = activeList.tasks.filter(task => {
            if (activeFilter === 'completed') {
                return task.completed;
            } else if (activeFilter === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = task.date ? new Date(task.date) : null;
                return !task.completed && dueDate && dueDate.setHours(0, 0, 0, 0) === today.getTime();
            } else if (activeFilter === 'upcoming') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                const dueDate = task.date ? new Date(task.date) : null;
                return !task.completed && dueDate && dueDate.setHours(0, 0, 0, 0) >= tomorrow.getTime();
            }
            return true; // 'all' filter
        });

        if (filteredTasks.length === 0 && activeList.tasks.length > 0) {
            // If tasks exist but none match current filter
            taskList.innerHTML = `<p class="empty-list-message">
                <i class="fas fa-search"></i> No tasks found matching current filter.
            </p>`;
        } else if (filteredTasks.length === 0 && activeList.tasks.length === 0) {
             emptyListMessage.style.display = 'flex'; // Show original empty message
        }


        const fragment = document.createDocumentFragment();
        filteredTasks.forEach(task => {
            const listItem = document.createElement('li');
            listItem.dataset.taskId = task.id;
            if (task.completed) {
                listItem.classList.add('completed');
            } else {
                const dueDate = task.date ? new Date(task.date) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);

                if (dueDate && dueDate.setHours(0, 0, 0, 0) === today.getTime()) {
                    listItem.classList.add('due-today');
                } else if (dueDate && dueDate.setHours(0, 0, 0, 0) === tomorrow.getTime()) {
                    listItem.classList.add('due-tomorrow');
                }
            }

            const formattedDate = task.date
                ? `<span><i class="fas fa-calendar-alt"></i> ${formatDate(task.date)}</span>`
                : '<span>No due date</span>';

            listItem.innerHTML = `
                <div class="task-details">
                    <span class="task-text">${task.text}</span>
                    <span class="due-date">${formattedDate}</span>
                </div>
                <div class="task-actions">
                    ${!task.completed ? `<button class="complete-btn" title="Mark Complete"><i class="fas fa-check"></i></button>` : ''}
                    <button class="delete-btn" title="Delete Task"><i class="fas fa-trash"></i></button>
                </div>
            `;
            fragment.appendChild(listItem);
        });
        taskList.appendChild(fragment);
        checkAllCompleted(); // Check confetti after rendering
    }

    function addTask() {
        const taskText = newTaskTextInput.value.trim();
        const taskDate = taskDueDateInput.value; // Already Y-m-d format from Flatpickr

        if (taskText && activeListId !== null) {
            const activeList = getActiveList();
            if (activeList) {
                const newTask = {
                    id: Date.now(),
                    text: taskText,
                    date: taskDate,
                    completed: false
                };
                activeList.tasks.push(newTask);
                saveState();
                newTaskTextInput.value = '';
                taskDueDateInput.value = ''; // Clear date input
                renderTasks();
            }
        }
    }

    function toggleCompleteTask(taskId) {
        const activeList = getActiveList();
        if (activeList) {
            activeList.tasks = activeList.tasks.map(task => {
                if (task.id === taskId) {
                    return { ...task, completed: !task.completed };
                }
                return task;
            });
            saveState();
            renderTasks();
            showCompletionMessage();
        }
    }

    function deleteTask(taskId) {
        const activeList = getActiveList();
        if (activeList && confirm('Are you sure you want to delete this task?')) {
            activeList.tasks = activeList.tasks.filter(task => task.id !== taskId);
            saveState();
            renderTasks();
        }
    }

    // --- UI Utility Functions ---
    function formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime()) {
            return 'Today';
        } else if (date.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        }
    }

    function showCompletionMessage() {
        completionMessage.classList.add('show');
        setTimeout(() => {
            completionMessage.classList.remove('show');
        }, 2000); // Message visible for 2 seconds
    }

    function checkAllCompleted() {
        const activeList = getActiveList();
        if (activeList && activeList.tasks.length > 0 && activeList.tasks.every(task => task.completed)) {
            triggerConfetti();
        }
    }

    function triggerConfetti() {
        myConfetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#FF7F50', '#FFA07A', '#FFD700', '#FF8C00'] // Orange palette for confetti
        });
    }

    function setActiveFilter(filter) {
        activeFilter = filter;
        filterButtons.forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        renderTasks();
    }


    // --- Event Listeners ---
    addListBtn.addEventListener('click', () => addList());
    newListNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addList();
    });

    listSelector.addEventListener('click', (e) => {
        const listItem = e.target.closest('li[data-list-id]');
        if (listItem) {
            const listId = parseInt(listItem.dataset.listId);
            if (e.target.classList.contains('delete-list-btn') || e.target.closest('.delete-list-btn')) {
                // Handle delete button click
                deleteList(listId);
            } else {
                // Handle switching list
                switchList(listId);
            }
        }
    });

    addTaskBtn.addEventListener('click', addTask);
    newTaskTextInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    taskDueDateInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    taskList.addEventListener('click', (e) => {
        const taskItem = e.target.closest('li[data-task-id]');
        if (taskItem) {
            const taskId = parseInt(taskItem.dataset.taskId);
            if (e.target.classList.contains('complete-btn') || e.target.closest('.complete-btn')) {
                toggleCompleteTask(taskId);
            } else if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
                deleteTask(taskId);
            }
        }
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            setActiveFilter(button.dataset.filter);
        });
    });

    // --- Initial Load ---
    init();
});