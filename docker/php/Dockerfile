FROM php:8.1-apache
COPY umam.ini /usr/local/etc/php/conf.d/umam.ini
RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers \
 && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf
