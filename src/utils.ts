export const injectCss = (css: string) => {
    const style = document.createElement('style')
    style.innerHTML = css
    document.head.appendChild(style)
}

function strToDate(str: string) {
    const [day, month, year] = str.split(' ')[0].split('.')
    const [hours, minutes] = str.split(' ')[1].split(':')
    return new Date(+year, +month - 1, +day, +hours, +minutes)
}

export function parseAvailableTests(doc = document) {
    const main = [...doc.querySelectorAll('div[role=main] > *')]
    return main.reduce((acc, el) => {
        if (el.nodeName === "HR") {
            return [...acc, [el]]
        } else {
            return [...acc.slice(0, -1), [...acc[acc.length - 1], el]]
        }
    }, [[]]).slice(1).map(test => {
        const title = test.find(el => el.nodeName === "H3")?.textContent.replace('Test: ', '')
        const id = test.find(el => el.nodeName === "DIV" && el.classList.contains('collapse'))?.id
        const link = test.find(el => el.nodeName === "H3")?.querySelector('a')?.href
        const openFrom = strToDate(test.find(el => el.nodeName === "TABLE")?.querySelector('tr:first-child > td:nth-child(2)').innerText)
        const openTo = strToDate(test.find(el => el.nodeName === "TABLE")?.querySelector('tr:nth-child(2) > td:nth-child(2)').innerText)
        const available = test.find(el => el.nodeName === "DIV" && el.classList.contains('collapse'))?.querySelectorAll('a')
        const availableDates = available ? [...available].map(a => {
            const href = a.href;
            const matches = /day=(\d+-\d+-\d+)/.exec(href)
            if (matches) {
                return {
                    parsedDate: matches ? matches[1] : null,
                    link: a.href,
                }
            } else {
                return null
            }

        }).filter(Boolean) : []
        const isAvailable = openTo > new Date() && id

        return {
            title, id, link, openFrom, openTo, isAvailable, availableDates
        }
    });
}

export function parseAvailableTimes(url?: string, doc: Document = document) {
    const match = /day=(\d+-\d+-\d+)/.exec(url || window.location.href)
    if (!match) return [];
    const [year, month, day] =  match[1].split('-');
    return [...doc.querySelectorAll('td a')].map((el: HTMLAnchorElement) => {
        const time = el.innerText.split(' - ')[0]
        const link = el.href
        const dateTime = new Date();
        const [hours, minutes] = time.split(':')
        dateTime.setHours(+hours)
        dateTime.setMinutes(+minutes)
        dateTime.setDate(+day)
        dateTime.setMonth(+month - 1)
        dateTime.setFullYear(+year)
        return {
            link, dateTime
        }
    })
}

export function convertDate<T extends Date | string>(date: T): T extends Date ? string : Date {
    if (typeof date === 'string') {
        return new Date(date) as T extends Date ? string : Date
    } else if (date instanceof Date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` as T extends Date ? string : Date
    } else {
        return null
    }
}

// 1 - a > b, 0 - a = b, -1 - a < b
export function compareDateStings(a: string, b: string) {
    const [Ayear, Amonth, Aday] =  a.split('-');
    const [Byear, Bmonth, Bday] =  b.split('-');
    if (
        +Ayear > +Byear ||
        (+Ayear === +Byear && +Amonth > +Bmonth) ||
        (+Ayear === +Byear && +Amonth === +Bmonth && +Aday > +Bday)
    ) {
        return 1
    }
    if (a === b) {
        return 0
    }
    if (
        +Ayear < +Byear ||
        (+Ayear === +Byear && +Amonth < +Bmonth) ||
        (+Ayear === +Byear && +Amonth === +Bmonth && +Aday < +Bday)
    ) {
        return -1
    }
}

export async function parseTimesPage(url: string) {
    const response = await fetch(url)
    const text = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/html')
    return parseAvailableTimes(url, doc)
}

export async function parseDatesPage(url: string) {
    const response = await fetch(url)
    const text = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/html')
    return parseAvailableTimes(url, doc)
}
