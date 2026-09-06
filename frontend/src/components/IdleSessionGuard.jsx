import {
  useEffect,
  useRef,
} from 'react';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  clearTokens,
  hasAuthTokens,
} from '../auth/tokenStorage';


const IDLE_TIMEOUT = 30 * 60 * 1000;
// 30 minut

const LAST_ACTIVITY_KEY =
  'medconnect_last_activity';


function IdleSessionGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  const timeoutRef = useRef(null);
  const lastStorageWriteRef = useRef(0);


  useEffect(() => {
    function clearLogoutTimer() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);

        timeoutRef.current = null;
      }
    }


    function logoutByInactivity() {
      clearLogoutTimer();

      clearTokens();

      localStorage.removeItem(
        LAST_ACTIVITY_KEY
      );

      navigate(
        '/login',
        {
          replace: true,
        }
      );
    }


    function scheduleLogout(
      remainingTime = IDLE_TIMEOUT
    ) {
      clearLogoutTimer();

      timeoutRef.current = setTimeout(
        logoutByInactivity,
        Math.max(
          remainingTime,
          0
        )
      );
    }


    /*
      Agar login qilinmagan bo‘lsa,
      timer kerak emas.
    */
    if (!hasAuthTokens()) {
      clearLogoutTimer();

      localStorage.removeItem(
        LAST_ACTIVITY_KEY
      );

      return undefined;
    }


    /*
      Sahifa qayta ochilganda oldingi
      activity vaqtini tekshiramiz.
    */
    const now = Date.now();

    const savedActivity = Number(
      localStorage.getItem(
        LAST_ACTIVITY_KEY
      )
    );


    if (savedActivity) {
      const idleTime =
        now - savedActivity;

      /*
        30 minutdan oshgan bo‘lsa,
        darhol logout.
      */
      if (idleTime >= IDLE_TIMEOUT) {
        logoutByInactivity();

        return undefined;
      }


      /*
        Masalan 20 minut ishlatilmagan
        bo‘lsa, yana 10 minutdan keyin
        logout qilamiz.
      */
      scheduleLogout(
        IDLE_TIMEOUT - idleTime
      );

    } else {
      /*
        Yangi login/session.
      */
      localStorage.setItem(
        LAST_ACTIVITY_KEY,
        String(now)
      );

      lastStorageWriteRef.current = now;

      scheduleLogout();
    }


    function registerActivity() {
      if (!hasAuthTokens()) {
        return;
      }

      const activityTime = Date.now();


      /*
        mousemove juda ko‘p event beradi.
        localStorage'ga har sekund
        yuzlab yozmaslik uchun
        maksimum 5 sekundda bir yozamiz.
      */
      if (
        activityTime
          - lastStorageWriteRef.current
        >= 5000
      ) {
        localStorage.setItem(
          LAST_ACTIVITY_KEY,
          String(activityTime)
        );

        lastStorageWriteRef.current =
          activityTime;
      }


      /*
        Har qanday activitydan keyin
        30 minut qaytadan boshlanadi.
      */
      scheduleLogout();
    }


    function checkSession() {
      if (!hasAuthTokens()) {
        return;
      }

      const lastActivity = Number(
        localStorage.getItem(
          LAST_ACTIVITY_KEY
        )
      );

      if (!lastActivity) {
        registerActivity();

        return;
      }

      const idleTime =
        Date.now() - lastActivity;

      if (idleTime >= IDLE_TIMEOUT) {
        logoutByInactivity();

        return;
      }

      scheduleLogout(
        IDLE_TIMEOUT - idleTime
      );
    }


    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];


    activityEvents.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          registerActivity,
          {
            passive: true,
          }
        );
      }
    );


    /*
      Tabdan chiqib qaytganda ham
      30 minut o‘tgan-o‘tmaganini
      tekshiradi.
    */
    function handleVisibilityChange() {
      if (
        document.visibilityState
        === 'visible'
      ) {
        checkSession();
      }
    }


    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );


    /*
      Bir browserda boshqa tabda
      logout bo‘lsa, bu tab ham
      login sahifasiga qaytadi.
    */
    function handleStorage(event) {
      if (
        event.key
        !== LAST_ACTIVITY_KEY
      ) {
        return;
      }

      if (!event.newValue) {
        if (!hasAuthTokens()) {
          navigate(
            '/login',
            {
              replace: true,
            }
          );
        }

        return;
      }

      checkSession();
    }


    window.addEventListener(
      'storage',
      handleStorage
    );


    return () => {
      clearLogoutTimer();

      activityEvents.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            registerActivity
          );
        }
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );

      window.removeEventListener(
        'storage',
        handleStorage
      );
    };

  }, [
    location.pathname,
    navigate,
  ]);


  return null;
}


export default IdleSessionGuard;