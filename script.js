document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const taskCount = document.getElementById('taskCount');
    const clearCompletedBtn = document.getElementById('clearCompleted');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const todoContainer = document.querySelector('.todo-container');
    const themeToggleBtn = document.getElementById('themeToggle');
    const themeIcon = themeToggleBtn.querySelector('i');
    
    // Initialize tasks from localStorage or empty array
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = localStorage.getItem('currentFilter') || 'all';
    
    // Theme management
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    let currentTheme = localStorage.getItem('theme') || 
                      (prefersDarkScheme.matches ? 'dark' : 'light');
    
    // Animation timing constants
    const ANIMATION_DURATION = 300;
    const STAGGER_DELAY = 50;
    
    // Check if this is the first visit
    const firstVisit = !localStorage.getItem('hasVisitedBefore');
    if (firstVisit) {
        localStorage.setItem('hasVisitedBefore', 'true');
        showWelcomeMessage();
    }
    
    // Initialize the app
    function init() {
        // Set initial theme
        setTheme(currentTheme);
        
        // Set initial filter
        setFilter(currentFilter, false);
        
        renderTasks();
        updateTaskCount();
        
        // Set up event listeners
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });
        
        clearCompletedBtn.addEventListener('click', clearCompleted);
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => setFilter(btn.dataset.filter));
        });
        
        // Theme toggle
        themeToggleBtn.addEventListener('click', toggleTheme);
        
        // Listen for system theme changes
        prefersDarkScheme.addListener(handleSystemThemeChange);
        
        // Register service worker for PWA
        registerServiceWorker();
    }
    
    // Add a new task with animation
    function addTask() {
        const text = taskInput.value.trim();
        
        // Validate input
        if (text === '') {
            // Add shake animation to input
            taskInput.classList.add('input-error');
            taskInput.focus();
            
            // Remove the error class after animation completes
            setTimeout(() => {
                taskInput.classList.remove('input-error');
            }, 1000);
            return;
        }
        
        // Create new task object
        const newTask = {
            id: Date.now(),
            text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        // Add to beginning of array
        tasks.unshift(newTask);
        saveTasks();
        
        // Clear input and refocus
        taskInput.value = '';
        taskInput.focus();
        
        // Animate the todo container
        animateAddTask();
        
        // Update the UI
        renderTasks();
        updateTaskCount();
    }
    
    // Animate the todo container when adding a task
    function animateAddTask() {
        todoContainer.animate([
            { transform: 'scale(1.01)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' },
            { transform: 'scale(1)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
        ], {
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        });
    }
    
    // Toggle task completion with animation
    function toggleTask(id) {
        tasks = tasks.map(task => 
            task.id === id ? { ...task, completed: !task.completed } : task
        );
        saveTasks();
        
        // Get the task element
        const taskElement = document.querySelector(`[data-id="${id}"]`);
        if (!taskElement) return;
        
        // Animate the task
        if (tasks.find(t => t.id === id)?.completed) {
            // If task is being marked as completed
            taskElement.style.transform = 'translateX(10px)';
            setTimeout(() => {
                taskElement.style.transform = 'translateX(0)';
                renderTasks();
                updateTaskCount();
            }, 150);
        } else {
            // If task is being marked as incomplete
            taskElement.style.transform = 'translateX(-10px)';
            setTimeout(() => {
                taskElement.style.transform = 'translateX(0)';
                renderTasks();
                updateTaskCount();
            }, 150);
        }
    }
    
    // Delete a task with animation
    async function deleteTask(id, e) {
        e.stopPropagation(); // Prevent event bubbling
        
        // Get the task element
        const taskElement = document.querySelector(`[data-id="${id}"]`);
        if (!taskElement) return;
        
        // Create a custom confirmation UI instead of default confirm
        const confirmDelete = await showDeleteConfirmation(taskElement);
        if (!confirmDelete) return;
        
        // Animate the task removal
        taskElement.style.transform = 'translateX(100%)';
        taskElement.style.opacity = '0';
        
        // Wait for the animation to complete
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION));
        
        // Remove the task from the array and update the UI
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
        updateTaskCount();
    }
    
    // Show a custom delete confirmation
    function showDeleteConfirmation(taskElement) {
        return new Promise((resolve) => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.right = '0';
            overlay.style.bottom = '0';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '1000';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            
            // Create confirmation box
            const confirmBox = document.createElement('div');
            confirmBox.style.background = 'white';
            confirmBox.style.padding = '1.5rem';
            confirmBox.style.borderRadius = '12px';
            confirmBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
            confirmBox.style.maxWidth = '320px';
            confirmBox.style.width = '90%';
            confirmBox.style.textAlign = 'center';
            confirmBox.style.transform = 'translateY(20px)';
            confirmBox.style.opacity = '0';
            confirmBox.style.transition = 'all 0.3s ease';
            
            // Add message
            const message = document.createElement('p');
            message.textContent = 'Are you sure you want to delete this task?';
            message.style.marginBottom = '1.5rem';
            message.style.color = 'var(--text)';
            
            // Add buttons container
            const buttons = document.createElement('div');
            buttons.style.display = 'flex';
            buttons.style.justifyContent = 'center';
            buttons.style.gap = '1rem';
            
            // Add cancel button
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.padding = '0.5rem 1.5rem';
            cancelBtn.style.border = '1px solid var(--border)';
            cancelBtn.style.borderRadius = '6px';
            cancelBtn.style.background = 'white';
            cancelBtn.style.cursor = 'pointer';
            cancelBtn.style.transition = 'all 0.2s';
            
            // Add confirm button
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Delete';
            confirmBtn.style.padding = '0.5rem 1.5rem';
            confirmBtn.style.border = 'none';
            confirmBtn.style.borderRadius = '6px';
            confirmBtn.style.background = 'var(--danger)';
            confirmBtn.style.color = 'white';
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.style.transition = 'all 0.2s';
            
            // Add event listeners
            cancelBtn.addEventListener('click', () => {
                overlay.style.opacity = '0';
                confirmBox.style.opacity = '0';
                confirmBox.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve(false);
                }, 300);
            });
            
            confirmBtn.addEventListener('click', () => {
                overlay.style.opacity = '0';
                confirmBox.style.opacity = '0';
                confirmBox.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve(true);
                }, 300);
            });
            
            // Assemble the confirmation box
            buttons.appendChild(cancelBtn);
            buttons.appendChild(confirmBtn);
            confirmBox.appendChild(message);
            confirmBox.appendChild(buttons);
            overlay.appendChild(confirmBox);
            document.body.appendChild(overlay);
            
            // Trigger reflow to enable transition
            void overlay.offsetWidth;
            
            // Show the overlay and confirmation box
            overlay.style.opacity = '1';
            setTimeout(() => {
                confirmBox.style.opacity = '1';
                confirmBox.style.transform = 'translateY(0)';
            }, 50);
            
            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.opacity = '0';
                    confirmBox.style.opacity = '0';
                    confirmBox.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        document.body.removeChild(overlay);
                        resolve(false);
                    }, 300);
                }
            });
        });
    }
    
    // Clear all completed tasks with animation
    async function clearCompleted() {
        const completedTasks = tasks.filter(task => task.completed);
        if (completedTasks.length === 0) return;
        
        // Animate each completed task removal
        const animations = [];
        const taskElements = document.querySelectorAll('.task-item.completed');
        
        taskElements.forEach((el, index) => {
            const animation = el.animate([
                { opacity: 1, transform: 'translateY(0)' },
                { opacity: 0, transform: 'translateY(-20px)' }
            ], {
                duration: ANIMATION_DURATION,
                easing: 'ease-out',
                delay: index * 50,
                fill: 'forwards'
            });
            animations.push(animation.finished);
        });
        
        // Wait for all animations to complete
        await Promise.all(animations);
        
        // Update the tasks array and save
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        
        // Re-render the list
        renderTasks();
        updateTaskCount();
        
        // Show a notification
        showNotification(`${completedTasks.length} task${completedTasks.length > 1 ? 's' : ''} cleared`);
    }
    
    // Set the current filter
    function setFilter(filter, saveToStorage = true) {
        currentFilter = filter;
        
        // Save to localStorage if needed
        if (saveToStorage) {
            localStorage.setItem('currentFilter', filter);
        }
        
        // Update active filter button
        filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Update URL hash
        window.location.hash = filter === 'all' ? '' : `#${filter}`;
        
        // Add a class to the body for filter-specific styling
        document.body.className = '';
        document.body.classList.add(`filter-${filter}`);
        
        renderTasks();
    }
    
    // Filter tasks based on current filter
    function getFilteredTasks() {
        switch (currentFilter) {
            case 'active':
                return tasks.filter(task => !task.completed);
            case 'completed':
                return tasks.filter(task => task.completed);
            default:
                return tasks;
        }
    }
    
    // Show a notification message
    function showNotification(message, type = 'info') {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            document.body.removeChild(existingNotification);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%) translateY(100px)';
        notification.style.padding = '12px 24px';
        notification.style.backgroundColor = type === 'error' ? 'var(--danger)' : 'var(--success)';
        notification.style.color = 'white';
        notification.style.borderRadius = '6px';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notification.style.zIndex = '1000';
        notification.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        notification.style.whiteSpace = 'nowrap';
        notification.style.maxWidth = '90%';
        notification.style.overflow = 'hidden';
        notification.style.textOverflow = 'ellipsis';
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Trigger the slide-up animation
        setTimeout(() => {
            notification.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        // Auto-remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Render tasks to the DOM with animations
    async function renderTasks() {
        const filteredTasks = getFilteredTasks();
        
        // If no tasks, show empty state
        if (filteredTasks.length === 0) {
            const emptyState = `
                <div class="empty-state">
                    <i class="far fa-clipboard"></i>
                    <p>${currentFilter === 'all' ? 'No tasks yet!' : 
                         currentFilter === 'active' ? 'No active tasks!' : 
                         'No completed tasks!'}</p>
                </div>
            `;
            taskList.innerHTML = emptyState;
            return;
        }
        
        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Add tasks with staggered animations
        filteredTasks.forEach((task, index) => {
            const taskElement = document.createElement('li');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskElement.dataset.id = task.id;
            taskElement.style.animationDelay = `${index * 50}ms`;
            
            taskElement.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${escapeHtml(task.text)}</span>
                <button class="delete-btn" aria-label="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            // Add event listeners
            const checkbox = taskElement.querySelector('.task-checkbox');
            const deleteBtn = taskElement.querySelector('.delete-btn');
            
            checkbox.addEventListener('change', () => toggleTask(task.id));
            deleteBtn.addEventListener('click', (e) => deleteTask(task.id, e));
            
            // Add to fragment
            fragment.appendChild(taskElement);
        });
        
        // Clear the task list and add the new tasks
        taskList.innerHTML = '';
        taskList.appendChild(fragment);
    }
    
    // Update the task counter with animation
    function updateTaskCount() {
        const activeTasks = tasks.filter(task => !task.completed).length;
        const totalTasks = tasks.length;
        
        // Animate the counter
        const countElement = taskCount;
        countElement.style.transform = 'scale(1.1)';
        countElement.style.transition = 'transform 0.2s ease';
        
        // Update the text
        if (totalTasks === 0) {
            countElement.textContent = 'All done! 🎉';
        } else {
            countElement.textContent = `${activeTasks} ${activeTasks === 1 ? 'task' : 'tasks'} left`;
        }
        
        // Reset the animation
        setTimeout(() => {
            countElement.style.transform = 'scale(1)';
        }, 200);
        
        // Disable clear completed button if no completed tasks
        const completedTasks = tasks.filter(task => task.completed);
        clearCompletedBtn.disabled = completedTasks.length === 0;
    }
    
    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        // Update the badge count if running as PWA
        if ('setAppBadge' in navigator) {
            const activeTasks = tasks.filter(task => !task.completed).length;
            navigator.setAppBadge(activeTasks).catch(console.error);
        }
    }
    
    // Theme management functions
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        // Update the theme icon
        const icon = theme === 'dark' ? 'sun' : 'moon';
        themeIcon.className = `fas fa-${icon}`;
        
        // Set meta theme color
        const themeColor = theme === 'dark' ? '#16213e' : '#6c5ce7';
        document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
    }
    
    function toggleTheme() {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        
        // Animate the theme toggle button
        themeToggleBtn.animate([
            { transform: 'rotate(0deg) scale(1)' },
            { transform: 'rotate(180deg) scale(1.2)' },
            { transform: 'rotate(360deg) scale(1)' }
        ], {
            duration: 500,
            easing: 'ease-in-out'
        });
        
        // Show a notification about the theme change
        showNotification(`Switched to ${newTheme} mode`, 'info');
    }
    
    function handleSystemThemeChange(e) {
        // Only change theme if user hasn't explicitly set a preference
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            setTheme(newTheme);
        }
    }
    
    // Service Worker Registration
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful');
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }
    }
    
    // Show welcome message on first visit
    function showWelcomeMessage() {
        setTimeout(() => {
            showNotification('Welcome to TaskFlow! Start adding your tasks.', 'success');
            
            // Add some sample tasks on first visit
            if (tasks.length === 0) {
                const sampleTasks = [
                    { id: Date.now() - 2, text: 'Click the + button to add a task', completed: false, createdAt: new Date().toISOString() },
                    { id: Date.now() - 1, text: 'Click the checkbox to complete a task', completed: true, createdAt: new Date().toISOString() },
                    { id: Date.now(), text: 'Swipe left or click the trash to delete', completed: false, createdAt: new Date().toISOString() }
                ];
                
                tasks = sampleTasks;
                saveTasks();
                renderTasks();
                updateTaskCount();
            }
        }, 1000);
    }
    
    // Helper function to escape HTML
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Initialize the app
    init();
});
