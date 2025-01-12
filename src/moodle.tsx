import {injectCss, parseAvailableTests, parseAvailableTimes} from "./utils";
import {SetupModal} from "./SetupModal";
import { createRoot } from 'react-dom/client';
import React from "react";
import ProgressModal from "./ProgressModal";

function createActionButtons(child: Node, testId: string) {
    const container = document.createElement('div')
    container.classList.add('btn-group')
    const button = document.createElement('span')
    button.classList.add('btn', 'btn-primary', 'searchButton')
    button.innerText = 'Хочу найти термин!'
    button.onclick = async () => {
        document.dispatchEvent(new CustomEvent('openTestovakModal', {detail: testId}))
    }
    container.appendChild(child)
    container.appendChild(button)
    return container;
}

function injectButtons() {
    const tests = parseAvailableTests();
    [...document.querySelectorAll('span.btn.btn-primary')].forEach(el => {
        const testId = el.getAttribute('data-target').replace('#', '') || "";
        const test = tests.find(test => test.id === testId);
        if (test && test.isAvailable) {
            el.replaceWith(createActionButtons(el.cloneNode(true), el.getAttribute('data-target').replace('#', '') || ""));
        }
    })
}

const isTestovak = parseAvailableTests().length > 0;

if (isTestovak) {

    const main = document.createElement('div')
    document.body.appendChild(main)

    const root = createRoot(main);
    root.render(<SetupModal />);

    chrome.storage.local.get(['isRunning', 'startDate', 'endDate', "startTime", "endTime"], function(result) {
        if (!result.isRunning) return;

        const isTimesPage = /day=(\d+-\d+-\d+)/.test(window.location.href)
        if (isTimesPage) {
            const availableTimes = parseAvailableTimes();

            const matchingTimes = availableTimes.filter(({dateTime}) => {
                const {startTime, endTime} = result;
                const [hours, minutes] = startTime.split(':')
                const startDate = new Date(dateTime)
                startDate.setHours(+hours)
                startDate.setMinutes(+minutes)
                const [endHours, endMinutes] = endTime.split(':')
                const endDate = new Date(dateTime)
                endDate.setHours(+endHours)
                endDate.setMinutes(+endMinutes)
                return dateTime >= new Date(startDate) && dateTime <= new Date(endDate)
            })

            if (matchingTimes.length > 0) {
                chrome.storage.local.set({isRunning: false}, function() {
                    window.location.href = matchingTimes[0].link
                })
            } else {
                window.history.back()
            }
        } else {
            root.render(<ProgressModal />);
        }
    });

    injectCss(`
        @property --gr1 {
          syntax: '<color>';
          initial-value: #662aca;
          inherits: false;
        }
        
        @property --gr2 {
          syntax: '<color>';
          initial-value: #ca2a9a;
          inherits: false;
        }
        
        .searchButton {
            --gr1: #662aca;
            --gr2: #ca2a9a;
            background: linear-gradient(228deg, var(--gr1), var(--gr2));
            background-size: 400% 400%;
        
            animation: btnAnim 5s ease infinite;
            
            transition: --gr1 .3s, --gr2 .3s;
        }
        
        .searchButton:hover {
            --gr1: #55ca2a;
            --gr2: #2acac4;
            
            color: white!important;
        }
        
        @keyframes btnAnim {
            0%{background-position:0% 83%}
            50%{background-position:100% 18%}
            100%{background-position:0% 83%}
        }
    `)
    injectButtons()
}
